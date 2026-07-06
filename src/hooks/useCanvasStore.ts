import { useState, useCallback, useEffect } from 'react'
import type {
  CanvasState,
  CanvasBlock,
  Connection,
  AssistantOutputBlock,
  MessagesBlock,
  Position,
  RequestBlock,
  SingleMessageBlock,
  Viewport,
} from '@/types/canvas'
import {
  createAssistantOutputBlock,
  createBlock,
  createConnection,
  createRequestBlock,
  createSingleMessageBlock,
} from '@/types/canvas'
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

  const rawKind = block.kind as unknown
  if (rawKind === 'request' || rawKind === 'request-json') {
    return {
      id: block.id,
      kind: 'request',
      title: block.title === 'Request JSON' ? 'Request' : block.title,
      position: block.position as Position,
      params: {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1,
        stream: true,
        ...(typeof block.params === 'object' && block.params ? block.params : {}),
      },
      tools: Array.isArray(block.tools) ? block.tools : [],
      modelOverride: typeof block.modelOverride === 'string' ? block.modelOverride : '',
      stopText: typeof block.stopText === 'string' ? block.stopText : '',
      advancedJson:
        typeof block.advancedJson === 'string'
          ? block.advancedJson
          : typeof block.json === 'string'
            ? block.json
            : '',
      isCollapsed: Boolean(block.isCollapsed),
    }
  }

  if (block.kind === 'assistant-output') {
    return {
      id: block.id,
      kind: 'assistant-output',
      title: block.title,
      position: block.position as Position,
      sourceBlockId: typeof block.sourceBlockId === 'string' ? block.sourceBlockId : '',
      content: typeof block.content === 'string' ? block.content : '',
      status:
        block.status === 'complete' || block.status === 'error' || block.status === 'streaming'
          ? block.status
          : 'streaming',
      isCollapsed: Boolean(block.isCollapsed),
    }
  }

  if (block.kind === 'message') {
    const message =
      block.message && typeof block.message === 'object'
        ? (block.message as Message)
        : { role: 'user', content: '' }
    return {
      id: block.id,
      kind: 'message',
      title: typeof block.title === 'string' && block.title ? block.title : message.role,
      position: block.position as Position,
      message,
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
  const firstMessagesBlockId = blocks.find((block) => block.kind === 'messages')?.id
  const normalizedBlocks = hasActiveMessagesBlock
    ? blocks
    : blocks.map((block) =>
        block.kind === 'messages' ? { ...block, isActive: block.id === firstMessagesBlockId } : block,
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

  const addRequestBlock = useCallback((position: Position, title?: string) => {
    setState((prev) => {
      const block = createRequestBlock(position, title)
      return { ...prev, blocks: [...prev.blocks, block] }
    })
  }, [])

  const addAssistantOutputBlock = useCallback((position: Position, sourceBlockId: string) => {
    const block = createAssistantOutputBlock(position, sourceBlockId)
    setState((prev) => ({
      ...prev,
      blocks: [...prev.blocks, block],
    }))
    return block.id
  }, [])

  const updateBlock = useCallback((
    id: string,
    patch:
      | Partial<MessagesBlock>
      | Partial<SingleMessageBlock>
      | Partial<RequestBlock>
      | Partial<AssistantOutputBlock>,
  ) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b): CanvasBlock => {
        if (b.id !== id) return b
        if (b.kind === 'messages') {
          return { ...b, ...(patch as Partial<MessagesBlock>), kind: 'messages' }
        }
        if (b.kind === 'request') {
          return { ...b, ...(patch as Partial<RequestBlock>), kind: 'request' }
        }
        if (b.kind === 'message') {
          return { ...b, ...(patch as Partial<SingleMessageBlock>), kind: 'message' }
        }
        return { ...b, ...(patch as Partial<AssistantOutputBlock>), kind: 'assistant-output' }
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
      if (source.kind === 'request') {
        const copy = createRequestBlock(position, `${source.title} (copy)`)
        copy.params = structuredClone(source.params)
        copy.tools = structuredClone(source.tools)
        copy.modelOverride = source.modelOverride
        copy.stopText = source.stopText
        copy.advancedJson = source.advancedJson
        return { ...prev, blocks: [...prev.blocks, copy] }
      }
      if (source.kind === 'assistant-output') return prev
      if (source.kind === 'message') {
        const copy = createSingleMessageBlock(position, structuredClone(source.message))
        copy.title = `${source.title} (copy)`
        return { ...prev, blocks: [...prev.blocks, copy] }
      }

      const copy = createBlock(position, `${source.title} (copy)`)
        ;(copy as MessagesBlock).messages = structuredClone(source.messages)
        ;(copy as MessagesBlock).systemPrompt = source.systemPrompt
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

  const updateAssistantOutput = useCallback((blockId: string, patch: Partial<AssistantOutputBlock>) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId && b.kind === 'assistant-output' ? { ...b, ...patch } : b,
      ),
    }))
  }, [])

  const moveMessageToNewBlock = useCallback((
    sourceBlockId: string,
    messageIndex: number,
    position: Position,
  ) => {
    setState((prev) => {
      const source = prev.blocks.find(
        (block): block is MessagesBlock => block.id === sourceBlockId && block.kind === 'messages',
      )
      if (!source || !source.messages[messageIndex]) return prev

      const message = structuredClone(source.messages[messageIndex])
      const nextSourceMessages = source.messages.filter((_, index) => index !== messageIndex)
      const newBlock = createSingleMessageBlock(position, message)

      return {
        ...prev,
        blocks: [
          ...prev.blocks.map((block) =>
            block.id === sourceBlockId && block.kind === 'messages'
              ? { ...block, messages: nextSourceMessages }
              : block,
          ),
          newBlock,
        ],
      }
    })
  }, [])

  const moveMessageToBlock = useCallback((
    sourceBlockId: string,
    targetBlockId: string,
    messageIndex: number,
  ) => {
    if (sourceBlockId === targetBlockId) return
    setState((prev) => {
      const source = prev.blocks.find(
        (block): block is MessagesBlock | SingleMessageBlock =>
          block.id === sourceBlockId && (block.kind === 'messages' || block.kind === 'message'),
      )
      const target = prev.blocks.find(
        (block): block is MessagesBlock => block.id === targetBlockId && block.kind === 'messages',
      )
      if (!source || !target) return prev
      const sourceMessage =
        source.kind === 'messages' ? source.messages[messageIndex] : source.message
      if (!sourceMessage) return prev
      const message = structuredClone(sourceMessage)

      return {
        ...prev,
        blocks: prev.blocks
          .map((block) => {
            if (block.id === sourceBlockId && block.kind === 'messages') {
              return {
                ...block,
                messages: block.messages.filter((_, index) => index !== messageIndex),
              }
            }
            if (block.id === targetBlockId && block.kind === 'messages') {
              return { ...block, messages: [...block.messages, message] }
            }
            return block
          })
          .filter((block) => {
            if (block.id === sourceBlockId && block.kind === 'message') return false
            if (block.id !== sourceBlockId || block.kind !== 'messages') return true
            if (block.isActive) return true
            return block.messages.length > 0
          }),
        connections:
          source.kind === 'message'
            ? prev.connections.filter(
                (connection) =>
                  connection.fromBlockId !== sourceBlockId &&
                  connection.toBlockId !== sourceBlockId,
              )
            : prev.connections,
      }
    })
  }, [])

  // Connections
  const addConnection = useCallback(
    (
      fromBlockId: string,
      toBlockId: string,
      label: string = '',
      variant: 'solid' | 'dashed' = 'solid',
    ) => {
      setState((prev) => {
        const conn = createConnection(fromBlockId, toBlockId, label, variant)
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
    addRequestBlock,
    addAssistantOutputBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    setActiveBlock,
    moveBlock,
    setBlockMessages,
    setBlockSystemPrompt,
    updateAssistantOutput,
    moveMessageToNewBlock,
    moveMessageToBlock,
    addConnection,
    updateConnection,
    deleteConnection,
  }
}
