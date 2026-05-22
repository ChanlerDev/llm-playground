import { useState, useCallback, useEffect } from 'react'
import type {
  CanvasState,
  MessagesBlock,
  Connection,
  Position,
  Viewport,
} from '@/types/canvas'
import { createBlock, createConnection } from '@/types/canvas'
import type { Message } from '@/types/provider'

const STORAGE_KEY = 'llm-canvas-state'

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

function loadState(): CanvasState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CanvasState
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

  const updateBlock = useCallback((id: string, patch: Partial<MessagesBlock>) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
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
      const copy = createBlock(
        { x: source.position.x + 40, y: source.position.y + 40 },
        `${source.title} (copy)`,
      )
      copy.messages = structuredClone(source.messages)
      copy.systemPrompt = source.systemPrompt
      return { ...prev, blocks: [...prev.blocks, copy] }
    })
  }, [])

  const setActiveBlock = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => ({ ...b, isActive: b.id === id })),
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
        b.id === blockId ? { ...b, messages } : b,
      ),
    }))
  }, [])

  const setBlockSystemPrompt = useCallback((blockId: string, systemPrompt: string) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, systemPrompt } : b,
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
  const activeBlock = state.blocks.find((b) => b.isActive) ?? state.blocks[0] ?? null

  return {
    state,
    viewport: state.viewport,
    blocks: state.blocks,
    connections: state.connections,
    activeBlock,

    setViewport,
    addBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    setActiveBlock,
    moveBlock,
    setBlockMessages,
    setBlockSystemPrompt,
    addConnection,
    updateConnection,
    deleteConnection,
  }
}
