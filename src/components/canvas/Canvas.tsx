import { useRef, useCallback, useState, useEffect } from 'react'
import { MessageSquarePlus, Settings2 } from 'lucide-react'
import { useGesture } from '@use-gesture/react'
import type {
  CanvasBlock as CanvasBlockModel,
  Connection,
  AssistantOutputBlock as AssistantOutputBlockModel,
  MessagesBlock,
  Position,
  RequestBlock,
  Viewport,
} from '@/types/canvas'
import { CanvasBlock } from './CanvasBlock'
import { RequestConfigBlock } from './RequestConfigBlock'
import { AssistantOutputBlock } from './AssistantOutputBlock'
import { ConnectionsLayer } from './ConnectionsLayer'
import type { Message } from '@/types/provider'
import { Button } from '@/components/ui/button'
import { findAttachedRequestBlock } from '@/services/request-block'

export type ConnectionMode =
  | { type: 'idle' }
  | { type: 'dragging'; fromBlockId: string; cursorPos: Position }
  | { type: 'button'; fromBlockId: string; cursorPos: Position }

type MessageDragMode = {
  sourceBlockId: string
  messageIndex: number
  cursorPos: Position
} | null

interface CanvasProps {
  viewport: Viewport
  blocks: CanvasBlockModel[]
  connections: Connection[]
  activeBlockId: string | null
  loadingBlockId: string | null
  onViewportChange: (viewport: Viewport) => void
  onBlockMove: (id: string, position: Position) => void
  onBlockSelect: (id: string) => void
  onBlockUpdate: (
    id: string,
    patch: Partial<MessagesBlock> | Partial<RequestBlock> | Partial<AssistantOutputBlockModel>,
  ) => void
  onBlockDelete: (id: string) => void
  onBlockDuplicate: (id: string) => void
  onBlockMessagesChange: (blockId: string, messages: Message[]) => void
  onBlockSystemPromptChange: (blockId: string, systemPrompt: string) => void
  onBlockSend: (blockId: string) => void
  onAbort: () => void
  onAddBlock: (position: Position) => void
  onAddRequestBlock: (position: Position) => void
  onAddConnection: (
    fromId: string,
    toId: string,
    label?: string,
    variant?: 'solid' | 'dashed',
  ) => void
  onDeleteConnection: (id: string) => void
  onUpdateConnection: (id: string, patch: Partial<Connection>) => void
  onMoveMessageToCanvas: (sourceBlockId: string, messageIndex: number, position: Position) => void
  onMoveMessageToBlock: (sourceBlockId: string, targetBlockId: string, messageIndex: number) => void
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const DOT_SIZE = 1.5
const DOT_SPACING = 24
const BLOCK_WIDTH = 320
const REQUEST_BLOCK_WIDTH = 380
const BLOCK_HEADER_HEIGHT = 36

function getBlockWidth(block: CanvasBlockModel): number {
  return block.kind === 'request' ? REQUEST_BLOCK_WIDTH : BLOCK_WIDTH
}

export function Canvas({
  viewport,
  blocks,
  connections,
  activeBlockId,
  loadingBlockId,
  onViewportChange,
  onBlockMove,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onBlockDuplicate,
  onBlockMessagesChange,
  onBlockSystemPromptChange,
  onBlockSend,
  onAbort,
  onAddBlock,
  onAddRequestBlock,
  onAddConnection,
  onDeleteConnection,
  onUpdateConnection,
  onMoveMessageToCanvas,
  onMoveMessageToBlock,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingBlock = useRef(false)

  // Connection mode state machine
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>({ type: 'idle' })
  const [hoverTargetBlockId, setHoverTargetBlockId] = useState<string | null>(null)
  const [messageDrag, setMessageDrag] = useState<MessageDragMode>(null)

  // --- Connection: port drag start ---
  const handlePortDragStart = useCallback((blockId: string, clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const canvasX = (clientX - rect.left - viewport.x) / viewport.zoom
    const canvasY = (clientY - rect.top - viewport.y) / viewport.zoom
    setConnectionMode({ type: 'dragging', fromBlockId: blockId, cursorPos: { x: canvasX, y: canvasY } })
  }, [viewport])

  const handleMessageDragStart = useCallback((
    sourceBlockId: string,
    messageIndex: number,
    clientX: number,
    clientY: number,
  ) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const canvasX = (clientX - rect.left - viewport.x) / viewport.zoom
    const canvasY = (clientY - rect.top - viewport.y) / viewport.zoom
    isDraggingBlock.current = true
    setMessageDrag({
      sourceBlockId,
      messageIndex,
      cursorPos: { x: canvasX, y: canvasY },
    })
  }, [viewport])

  useEffect(() => {
    if (!messageDrag) return

    const handleMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom
      const canvasY = (e.clientY - rect.top - viewport.y) / viewport.zoom
      setMessageDrag((prev) => prev ? { ...prev, cursorPos: { x: canvasX, y: canvasY } } : prev)
    }

    const handleUp = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom
      const canvasY = (e.clientY - rect.top - viewport.y) / viewport.zoom
      const targetBlock = [...blocks].reverse().find((block) => {
        const bh = block.isCollapsed ? BLOCK_HEADER_HEIGHT : 420
        return (
          canvasX >= block.position.x &&
          canvasX <= block.position.x + getBlockWidth(block) &&
          canvasY >= block.position.y &&
          canvasY <= block.position.y + bh
        )
      })

      if (
        targetBlock?.kind === 'messages' &&
        targetBlock.id !== messageDrag.sourceBlockId
      ) {
        onMoveMessageToBlock(messageDrag.sourceBlockId, targetBlock.id, messageDrag.messageIndex)
      } else {
        onMoveMessageToCanvas(messageDrag.sourceBlockId, messageDrag.messageIndex, { x: canvasX, y: canvasY })
      }
      setMessageDrag(null)
      isDraggingBlock.current = false
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }
  }, [blocks, messageDrag, onMoveMessageToBlock, onMoveMessageToCanvas, viewport])

  // --- Connection: button mode start (🔗 click) ---
  const handleConnectionButtonStart = useCallback((blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    // Initialize cursor at block's right port
    const cursorPos = { x: block.position.x + BLOCK_WIDTH, y: block.position.y + BLOCK_HEADER_HEIGHT / 2 }
    setConnectionMode({ type: 'button', fromBlockId: blockId, cursorPos })
  }, [blocks])

  // --- Connection: cancel ---
  const cancelConnection = useCallback(() => {
    setConnectionMode({ type: 'idle' })
    setHoverTargetBlockId(null)
  }, [])

  // --- Connection: complete (create) ---
  const completeConnection = useCallback((targetBlockId: string) => {
    if (connectionMode.type === 'idle') return
    const fromId = connectionMode.fromBlockId
    if (fromId && fromId !== targetBlockId) {
      const fromBlock = blocks.find((block) => block.id === fromId)
      const toBlock = blocks.find((block) => block.id === targetBlockId)
      const label = fromBlock?.kind === 'request' || toBlock?.kind === 'request' ? 'request' : ''
      onAddConnection(fromId, targetBlockId, label)
    }
    setConnectionMode({ type: 'idle' })
    setHoverTargetBlockId(null)
  }, [blocks, connectionMode, onAddConnection])

  // --- Document-level pointer tracking for dragging mode ---
  const draggingFromBlockId = connectionMode.type === 'dragging' ? connectionMode.fromBlockId : null

  useEffect(() => {
    if (!draggingFromBlockId) return

    const handleMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom
      const canvasY = (e.clientY - rect.top - viewport.y) / viewport.zoom
      setConnectionMode((prev) => {
        if (prev.type !== 'dragging') return prev
        return { ...prev, cursorPos: { x: canvasX, y: canvasY } }
      })
      // Hit test for hover target
      const hitId = (() => {
        for (let i = blocks.length - 1; i >= 0; i--) {
          const b = blocks[i]
          const bh = b.isCollapsed ? BLOCK_HEADER_HEIGHT : 200
          if (canvasX >= b.position.x && canvasX <= b.position.x + getBlockWidth(b) &&
              canvasY >= b.position.y && canvasY <= b.position.y + bh) {
            return b.id
          }
        }
        return null
      })()
      setHoverTargetBlockId(hitId !== draggingFromBlockId ? hitId : null)
    }

    const handleUp = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom
      const canvasY = (e.clientY - rect.top - viewport.y) / viewport.zoom
      const hitId = (() => {
        for (let i = blocks.length - 1; i >= 0; i--) {
          const b = blocks[i]
          const bh = b.isCollapsed ? BLOCK_HEADER_HEIGHT : 200
          if (canvasX >= b.position.x && canvasX <= b.position.x + getBlockWidth(b) &&
              canvasY >= b.position.y && canvasY <= b.position.y + bh) {
            return b.id
          }
        }
        return null
      })()
      if (hitId && hitId !== draggingFromBlockId) {
        const fromBlock = blocks.find((block) => block.id === draggingFromBlockId)
        const toBlock = blocks.find((block) => block.id === hitId)
        const label = fromBlock?.kind === 'request' || toBlock?.kind === 'request' ? 'request' : ''
        onAddConnection(draggingFromBlockId, hitId, label)
      }
      setConnectionMode({ type: 'idle' })
      setHoverTargetBlockId(null)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }
  }, [draggingFromBlockId, viewport, blocks, onAddConnection])

  // --- ESC key listener ---
  useEffect(() => {
    if (connectionMode.type === 'idle') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelConnection()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [connectionMode.type, cancelConnection])

  // --- Button mode: track cursor for preview line ---
  const buttonFromBlockId = connectionMode.type === 'button' ? connectionMode.fromBlockId : null

  useEffect(() => {
    if (!buttonFromBlockId) return

    const handleMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom
      const canvasY = (e.clientY - rect.top - viewport.y) / viewport.zoom
      setConnectionMode((prev) => {
        if (prev.type !== 'button') return prev
        return { ...prev, cursorPos: { x: canvasX, y: canvasY } }
      })
      // Hit test for hover target
      const hitId = (() => {
        for (let i = blocks.length - 1; i >= 0; i--) {
          const b = blocks[i]
          const bh = b.isCollapsed ? BLOCK_HEADER_HEIGHT : 200
          if (canvasX >= b.position.x && canvasX <= b.position.x + getBlockWidth(b) &&
              canvasY >= b.position.y && canvasY <= b.position.y + bh) {
            return b.id
          }
        }
        return null
      })()
      setHoverTargetBlockId(hitId !== buttonFromBlockId ? hitId : null)
    }

    document.addEventListener('pointermove', handleMove)
    return () => document.removeEventListener('pointermove', handleMove)
  }, [buttonFromBlockId, viewport, blocks])

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], event, pinching }) => {
        if (pinching) return
        if (isDraggingBlock.current) return
        if (connectionMode.type === 'dragging') return
        const target = event.target as HTMLElement
        if (target !== containerRef.current && !target.classList.contains('canvas-bg')) return
        onViewportChange({
          ...viewport,
          x: viewport.x + dx,
          y: viewport.y + dy,
        })
      },
      onWheel: ({ delta: [, dy], event }) => {
        const target = event.target as HTMLElement
        if (target.closest('[data-scrollable]')) return

        event.preventDefault()
        const factor = dy > 0 ? 0.95 : 1.05
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor))

        const rect = containerRef.current!.getBoundingClientRect()
        const cx = event.clientX - rect.left
        const cy = event.clientY - rect.top

        const scale = newZoom / viewport.zoom
        const newX = cx - (cx - viewport.x) * scale
        const newY = cy - (cy - viewport.y) * scale

        onViewportChange({ x: newX, y: newY, zoom: newZoom })
      },
      onPinch: ({ offset: [scale], origin: [ox, oy] }) => {
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))
        const rect = containerRef.current!.getBoundingClientRect()
        const cx = ox - rect.left
        const cy = oy - rect.top

        const s = newZoom / viewport.zoom
        const newX = cx - (cx - viewport.x) * s
        const newY = cy - (cy - viewport.y) * s

        onViewportChange({ x: newX, y: newY, zoom: newZoom })
      },
    },
    {
      drag: { filterTaps: true },
      wheel: { eventOptions: { passive: false } },
      pinch: { scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM } },
    },
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target !== containerRef.current && !target.classList.contains('canvas-bg')) return
      const rect = containerRef.current!.getBoundingClientRect()
      const x = (e.clientX - rect.left - viewport.x) / viewport.zoom
      const y = (e.clientY - rect.top - viewport.y) / viewport.zoom
      onAddBlock({ x, y })
    },
    [viewport, onAddBlock],
  )

  const getDefaultNewBlockPosition = useCallback((): Position => {
    const rect = containerRef.current?.getBoundingClientRect()
    const screenX = rect ? rect.width / 2 : 320
    const screenY = rect ? rect.height / 2 : 240
    return {
      x: (screenX - viewport.x) / viewport.zoom,
      y: (screenY - viewport.y) / viewport.zoom,
    }
  }, [viewport])

  const readMessageDragData = useCallback((dataTransfer: DataTransfer): {
    sourceBlockId: string
    messageIndex: number
  } | null => {
    const raw = dataTransfer.getData('application/x-llm-message')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as { sourceBlockId?: string; messageIndex?: number }
      if (typeof parsed.sourceBlockId !== 'string' || typeof parsed.messageIndex !== 'number') {
        return null
      }
      return { sourceBlockId: parsed.sourceBlockId, messageIndex: parsed.messageIndex }
    } catch {
      return null
    }
  }, [])

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-message-drop-target]')) return
      const dragData = readMessageDragData(e.dataTransfer)
      if (!dragData) return
      e.preventDefault()
      e.stopPropagation()
      const rect = containerRef.current!.getBoundingClientRect()
      const x = (e.clientX - rect.left - viewport.x) / viewport.zoom
      const y = (e.clientY - rect.top - viewport.y) / viewport.zoom
      onMoveMessageToCanvas(dragData.sourceBlockId, dragData.messageIndex, { x, y })
    },
    [onMoveMessageToCanvas, readMessageDragData, viewport],
  )

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-llm-message')) {
      e.preventDefault()
    }
  }, [])

  // Click on background in button mode → cancel
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target !== containerRef.current && !target.classList.contains('canvas-bg')) return
      if (connectionMode.type === 'button') {
        cancelConnection()
      }
    },
    [connectionMode.type, cancelConnection],
  )

  const handleBlockDragStart = useCallback(() => {
    isDraggingBlock.current = true
  }, [])

  const handleBlockDragEnd = useCallback(() => {
    isDraggingBlock.current = false
  }, [])

  // Block hover tracking for button mode
  const handleBlockHover = useCallback((blockId: string, entering: boolean) => {
    if (connectionMode.type === 'idle') return
    if (connectionMode.fromBlockId === blockId) return
    setHoverTargetBlockId(entering ? blockId : null)
  }, [connectionMode])

  // Block click in button mode → create connection
  const handleBlockClickForConnection = useCallback((blockId: string) => {
    if (connectionMode.type !== 'button') return
    if (connectionMode.fromBlockId === blockId) return
    completeConnection(blockId)
  }, [connectionMode, completeConnection])

  // Compute preview line data for ConnectionsLayer
  const previewLine = (() => {
    if (connectionMode.type === 'dragging' || connectionMode.type === 'button') {
      const fromBlock = blocks.find(b => b.id === connectionMode.fromBlockId)
      if (!fromBlock) return null
      return {
        fromBlock,
        cursorPos: connectionMode.cursorPos,
      }
    }
    return null
  })()

  // Dot grid background pattern
  const dotGridStyle = {
    backgroundImage: `radial-gradient(circle, var(--hairline) ${DOT_SIZE}px, transparent ${DOT_SIZE}px)`,
    backgroundSize: `${DOT_SPACING * viewport.zoom}px ${DOT_SPACING * viewport.zoom}px`,
    backgroundPosition: `${viewport.x % (DOT_SPACING * viewport.zoom)}px ${viewport.y % (DOT_SPACING * viewport.zoom)}px`,
  }

  const cursorClass = connectionMode.type !== 'idle' ? 'cursor-crosshair' : ''

  return (
    <div
      ref={containerRef}
      {...bind()}
      className={`canvas-bg relative h-full w-full touch-none overflow-hidden bg-canvas ${cursorClass}`}
      style={dotGridStyle}
      onDoubleClick={handleDoubleClick}
      onClick={handleBackgroundClick}
      onDrop={handleCanvasDrop}
      onDragOver={handleCanvasDragOver}
    >
      {/* Button mode banner */}
      {connectionMode.type === 'button' && (
        <div className="absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-md border border-hairline bg-surface-card px-3 py-1.5 text-body-sm text-muted shadow-sm">
          Click target block to connect · <kbd className="rounded border border-hairline px-1 text-[10px]">ESC</kbd> to cancel
        </div>
      )}

      <div className="absolute right-4 top-16 z-20 flex items-center gap-2 sm:top-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 bg-surface-card"
          onClick={(e) => {
            e.stopPropagation()
            onAddBlock(getDefaultNewBlockPosition())
          }}
        >
          <MessageSquarePlus className="size-3.5" />
          Message
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 bg-surface-card"
          onClick={(e) => {
            e.stopPropagation()
            const pos = getDefaultNewBlockPosition()
            onAddRequestBlock({ x: pos.x + 40, y: pos.y + 40 })
          }}
        >
          <Settings2 className="size-3.5" />
          Request
        </Button>
      </div>

      {/* SVG connections layer */}
      <ConnectionsLayer
        connections={connections}
        blocks={blocks}
        viewport={viewport}
        onDeleteConnection={onDeleteConnection}
        onUpdateConnection={onUpdateConnection}
        previewLine={previewLine}
      />

      {/* Transform container for blocks */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {blocks.map((block) =>
          block.kind === 'messages' ? (
            <CanvasBlock
              key={block.id}
              block={block}
              isActive={block.id === activeBlockId}
              isLoading={block.id === loadingBlockId}
              isConnectionTarget={hoverTargetBlockId === block.id}
              connectionMode={connectionMode}
              onSelect={() => onBlockSelect(block.id)}
              onMove={(pos) => onBlockMove(block.id, pos)}
              onUpdate={(patch) => onBlockUpdate(block.id, patch)}
              onDelete={() => onBlockDelete(block.id)}
              onDuplicate={() => onBlockDuplicate(block.id)}
              onMessagesChange={(msgs) => onBlockMessagesChange(block.id, msgs)}
              onSystemPromptChange={(sp) => onBlockSystemPromptChange(block.id, sp)}
              onSend={() => onBlockSend(block.id)}
              onAbort={onAbort}
              onDragStart={handleBlockDragStart}
              onDragEnd={handleBlockDragEnd}
              onConnectionButtonStart={() => handleConnectionButtonStart(block.id)}
              onPortDragStart={(clientX, clientY) => handlePortDragStart(block.id, clientX, clientY)}
              onBlockHover={(entering) => handleBlockHover(block.id, entering)}
              onBlockClickForConnection={() => handleBlockClickForConnection(block.id)}
              onMessageDragStart={(messageIndex, clientX, clientY) =>
                handleMessageDragStart(block.id, messageIndex, clientX, clientY)
              }
              onMoveMessageToBlock={(sourceBlockId, messageIndex) =>
                onMoveMessageToBlock(sourceBlockId, block.id, messageIndex)
              }
              attachedRequestTitle={
                findAttachedRequestBlock(block.id, blocks, connections)?.title ?? null
              }
              zoom={viewport.zoom}
            />
          ) : block.kind === 'request' ? (
            <RequestConfigBlock
              key={block.id}
              block={block}
              isConnectionTarget={hoverTargetBlockId === block.id}
              connectionMode={connectionMode}
              onMove={(pos) => onBlockMove(block.id, pos)}
              onUpdate={(patch) => onBlockUpdate(block.id, patch)}
              onDelete={() => onBlockDelete(block.id)}
              onDuplicate={() => onBlockDuplicate(block.id)}
              onDragStart={handleBlockDragStart}
              onDragEnd={handleBlockDragEnd}
              onConnectionButtonStart={() => handleConnectionButtonStart(block.id)}
              onPortDragStart={(clientX, clientY) => handlePortDragStart(block.id, clientX, clientY)}
              onBlockHover={(entering) => handleBlockHover(block.id, entering)}
              onBlockClickForConnection={() => handleBlockClickForConnection(block.id)}
              zoom={viewport.zoom}
            />
          ) : (
            <AssistantOutputBlock key={block.id} block={block} />
          ),
        )}
      </div>

      {messageDrag && (
        <div
          className="pointer-events-none absolute z-30 rounded border border-primary bg-surface-card px-2 py-1 text-[12px] text-primary shadow-sm"
          style={{
            left: messageDrag.cursorPos.x * viewport.zoom + viewport.x,
            top: messageDrag.cursorPos.y * viewport.zoom + viewport.y,
            transform: 'translate(8px, 8px)',
          }}
        >
          Move message
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 rounded-md border border-hairline bg-surface-card px-2 py-1 text-caption text-muted">
        {Math.round(viewport.zoom * 100)}%
      </div>

      {/* Hint */}
      {blocks.length === 0 && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-muted">
          <p className="text-body-md">Double-click to create a block</p>
        </div>
      )}
    </div>
  )
}
