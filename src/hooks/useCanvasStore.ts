import { useState, useCallback, useEffect } from 'react'
import type {
  CanvasState,
  CanvasBlock,
  Connection,
  JsonRequestBlock,
  MessagesBlock,
  Position,
  Viewport,
} from '@/types/canvas'
import { createBlock, createConnection, createJsonRequestBlock } from '@/types/canvas'
import type { Message } from '@/types/provider'

const STORAGE_KEY = 'llm-canvas-state'

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

function normalizeBlock(block: Partial<CanvasBlock> & Record<string, unknown>): CanvasBlock | null {
  if (typeof block.id !== 'string' || typeof block.title !== 'string') return null
  if (
    !block.position ||
    typeof block.position !== 'object' ||
    typeof (block.position as Position).x !== 'number' ||
    typeof (block.position as Position).y !== 'number'
  ) {
    return null
  }

  if (block.kind === 'request-json') {
    return {
      id: block.id,
      kind: 'request-json',
      title: block.title,
      position: block.position as Position,
      json: typeof block.json === 'string' ? block.json : '{}',
      isCollapsed: Boolean(block.isCollapsed),
    }
  }

  return {
    id: block.id,
    kind: 'messages',
    title: block.title,
    position: block.position as Position,
    messages: Array.isArray(block.messages) ? (block.messages as Message[]) : [],
    systemPrompt: typeof block.systemPrompt === 'string' ? block.systemPrompt : '',
    isActive: Boolean(block.isActive),
    isCollapsed: Boolean(block.isCollapsed),
  }
}

function normalizeState(state: CanvasState): CanvasState {
  const blocks = Array.isArray(state.blocks)
    ? state.blocks
        .map((block) => normalizeBlock(block as Partial<CanvasBlock> & Record<string, unknown>))
        .filter((block): block is CanvasBlock => Boolean(block))
    : []

  const hasActiveMessagesBlock = blocks.some(
    (block) => block.kind === 'messages' && block.isActive,
  )
  const normalizedBlocks = hasActiveMessagesBlock
    ? blocks
    : blocks.map((block, index) =>
        block.kind === 'messages' ? { ...block, isActive: index === 0 } : block,
      )

  return {
    blocks: normalizedBlocks,
    connections: Array.isArray(state.connections) ? state.connections : [],
    viewport: state.viewport ?? DEFAULT_VIEWPORT,
  }
}

function loadState(): CanvasState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeState(JSON.parse(raw) as CanvasState)
  } catch {
    return null
  }
}

function saveState(state: CanvasState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // silently ignore
  }
}

function createInitialState(): CanvasState {
  const block = createBlock({ x: 200, y: 150 }, 'Messages')
  block.isActive = true
  return {
    blocks: [block],
    connections: [],
    viewport: DEFAULT_VIEWPORT,
  }
}

export function useCanvasStore() {
  const [state, setState] = useState<CanvasState>(() => {
    return loadState() ?? createInitialState()
  })

  // Persist on every change
  useEffect(() => {
    saveState(state)
  }, [state])

  // Viewport
  const setViewport = useCallback((viewport: Viewport) => {
    setState((prev) => ({ ...prev, viewport }))
  }, [])

  // Blocks
  const addBlock = useCallback((position: Position, title?: string) => {
    setState((prev) => {
      const block = createBlock(position, title)
      return { ...prev, blocks: [...prev.blocks, block] }
    })
  }, [])

  const addJsonRequestBlock = useCallback((position: Position, title?: string) => {
    setState((prev) => {
      const block = createJsonRequestBlock(position, title)
      return { ...prev, blocks: [...prev.blocks, block] }
    })
  }, [])

  const updateBlock = useCallback((id: string, patch: Partial<MessagesBlock> | Partial<JsonRequestBlock>) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b): CanvasBlock => {
        if (b.id !== id) return b
        if (b.kind === 'messages') {
          return { ...b, ...(patch as Partial<MessagesBlock>), kind: 'messages' }
        }
        return { ...b, ...(patch as Partial<JsonRequestBlock>), kind: 'request-json' }
      }),
    }))
  }, [])

  const deleteBlock = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
      connections: prev.connections.filter(
        (c) => c.fromBlockId !== id && c.toBlockId !== id,
      ),
    }))
  }, [])

  const duplicateBlock = useCallback((id: string) => {
    setState((prev) => {
      const source = prev.blocks.find((b) => b.id === id)
      if (!source) return prev
      const position = { x: source.position.x + 40, y: source.position.y + 40 }
      const copy =
        source.kind === 'request-json'
          ? createJsonRequestBlock(position, `${source.title} (copy)`)
          : createBlock(position, `${source.title} (copy)`)
      if (source.kind === 'request-json') {
        ;(copy as JsonRequestBlock).json = source.json
      } else {
        ;(copy as MessagesBlock).messages = structuredClone(source.messages)
        ;(copy as MessagesBlock).systemPrompt = source.systemPrompt
      }
      return { ...prev, blocks: [...prev.blocks, copy] }
    })
  }, [])

  const setActiveBlock = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.kind === 'messages' ? { ...b, isActive: b.id === id } : b,
      ),
    }))
  }, [])

  const moveBlock = useCallback((id: string, position: Position) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, position } : b)),
    }))
  }, [])

  // Messages within a block
  const setBlockMessages = useCallback((blockId: string, messages: Message[]) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.kind === 'messages' ? { ...b, messages } : b,
      ),
    }))
  }, [])

  const setBlockSystemPrompt = useCallback((blockId: string, systemPrompt: string) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.kind === 'messages' ? { ...b, systemPrompt } : b,
      ),
    }))
  }, [])

  const setJsonRequest = useCallback((blockId: string, json: string) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.kind === 'request-json' ? { ...b, json } : b,
      ),
    }))
  }, [])

  // Connections
  const addConnection = useCallback(
    (fromBlockId: string, toBlockId: string, label: string = '') => {
      setState((prev) => {
        const conn = createConnection(fromBlockId, toBlockId, label)
        return { ...prev, connections: [...prev.connections, conn] }
      })
    },
    [],
  )

  const updateConnection = useCallback((id: string, patch: Partial<Connection>) => {
    setState((prev) => ({
      ...prev,
      connections: prev.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }, [])

  const deleteConnection = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== id),
    }))
  }, [])

  // Derived
  const activeBlock =
    state.blocks.find((b): b is MessagesBlock => b.kind === 'messages' && b.isActive) ??
    state.blocks.find((b): b is MessagesBlock => b.kind === 'messages') ??
    null

  return {
    state,
    viewport: state.viewport,
    blocks: state.blocks,
    connections: state.connections,
    activeBlock,

    setViewport,
    addBlock,
    addJsonRequestBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    setActiveBlock,
    moveBlock,
    setBlockMessages,
    setBlockSystemPrompt,
    setJsonRequest,
    addConnection,
    updateConnection,
    deleteConnection,
  }
}
