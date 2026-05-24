import { useRef, useCallback, useState, useEffect } from 'react'
import { useGesture } from '@use-gesture/react'
import type { Viewport, MessagesBlock, Connection, Position } from '@/types/canvas'
import { CanvasBlock } from './CanvasBlock'
import { ConnectionsLayer } from './ConnectionsLayer'
import type { Message } from '@/types/provider'

export type ConnectionMode =
  | { type: 'idle' }
  | { type: 'dragging'; fromBlockId: string; cursorPos: Position }
  | { type: 'button'; fromBlockId: string }

interface CanvasProps {
  viewport: Viewport
  blocks: MessagesBlock[]
  connections: Connection[]
  activeBlockId: string | null
  loadingBlockId: string | null
  onViewportChange: (viewport: Viewport) => void
  onBlockMove: (id: string, position: Position) => void
  onBlockSelect: (id: string) => void
  onBlockUpdate: (id: string, patch: Partial<MessagesBlock>) => void
  onBlockDelete: (id: string) => void
  onBlockDuplicate: (id: string) => void
  onBlockMessagesChange: (blockId: string, messages: Message[]) => void
  onBlockSystemPromptChange: (blockId: string, systemPrompt: string) => void
  onBlockSend: (blockId: string) => void
  onAbort: () => void
  onAddBlock: (position: Position) => void
  onAddConnection: (fromId: string, toId: string, label?: string) => void
  onDeleteConnection: (id: string) => void
  onUpdateConnection: (id: string, patch: Partial<Connection>) => void
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const DOT_SIZE = 1.5
const DOT_SPACING = 24
const BLOCK_WIDTH = 320
const BLOCK_HEADER_HEIGHT = 36

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
  onAddConnection,
  onDeleteConnection,
  onUpdateConnection,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingBlock = useRef(false)

  // Connection mode state machine
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>({ type: 'idle' })
  const [hoverTargetBlockId, setHoverTargetBlockId] = useState<string | null>(null)

  // --- Connection: port drag start ---
  const handlePortDragStart = useCallback((blockId: string, clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    // Convert client coords to canvas (world) coords
    const canvasX = (clientX - rect.left - viewport.x) / viewport.zoom
    const canvasY = (clientY - rect.top - viewport.y) / viewport.zoom
    setConnectionMode({ type: 'dragging', fromBlockId: blockId, cursorPos: { x: canvasX, y: canvasY } })
  }, [viewport])

  // --- Connection: button mode start (🔗 click) ---
  const handleConnectionButtonStart = useCallback((blockId: string) => {
    setConnectionMode({ type: 'button', fromBlockId: blockId })
  }, [])

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
      onAddConnection(fromId, targetBlockId)
    }
    setConnectionMode({ type: 'idle' })
    setHoverTargetBlockId(null)
  }, [connectionMode, onAddConnection])


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
          if (canvasX >= b.position.x && canvasX <= b.position.x + BLOCK_WIDTH &&
              canvasY >= b.position.y && canvasY <= b.position.y + bh) {
            return b.id
          }
        }
        return null
      })()
      // Don't highlight the source block
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
          if (canvasX >= b.position.x && canvasX <= b.position.x + BLOCK_WIDTH &&
              canvasY >= b.position.y && canvasY <= b.position.y + bh) {
            return b.id
          }
        }
        return null
      })()
      if (hitId && hitId !== draggingFromBlockId) {
        onAddConnection(draggingFromBlockId, hitId)
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

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], event, pinching }) => {
        if (pinching) return
        // Don't pan if dragging a block or a connection
        if (isDraggingBlock.current) return
        if (connectionMode.type === 'dragging') return
        // Only pan from background
        const target = event.target as HTMLElement
        if (target !== containerRef.current && !target.classList.contains('canvas-bg')) return
        onViewportChange({
          ...viewport,
          x: viewport.x + dx,
          y: viewport.y + dy,
        })
      },
      onWheel: ({ delta: [, dy], event }) => {
        // Don't zoom if scrolling inside a scrollable element (e.g. messages list)
        const target = event.target as HTMLElement
        if (target.closest('[data-scrollable]')) return

        event.preventDefault()
        const factor = dy > 0 ? 0.95 : 1.05
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor))

        // Zoom toward cursor position
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
      // Convert screen position to canvas position
      const rect = containerRef.current!.getBoundingClientRect()
      const x = (e.clientX - rect.left - viewport.x) / viewport.zoom
      const y = (e.clientY - rect.top - viewport.y) / viewport.zoom
      onAddBlock({ x, y })
    },
    [viewport, onAddBlock],
  )

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
    if (connectionMode.type !== 'button') return
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
    if (connectionMode.type === 'dragging') {
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

  // Cursor class for connection modes
  const cursorClass = connectionMode.type !== 'idle' ? 'cursor-crosshair' : ''

  return (
    <div
      ref={containerRef}
      {...bind()}
      className={`canvas-bg relative h-full w-full touch-none overflow-hidden bg-canvas ${cursorClass}`}
      style={dotGridStyle}
      onDoubleClick={handleDoubleClick}
      onClick={handleBackgroundClick}
    >
      {/* Button mode banner */}
      {connectionMode.type === 'button' && (
        <div className="absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-md border border-hairline bg-surface-card px-3 py-1.5 text-body-sm text-muted shadow-sm">
          Click target block to connect · <kbd className="rounded border border-hairline px-1 text-[10px]">ESC</kbd> to cancel
        </div>
      )}

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
        {blocks.map((block) => (
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
            zoom={viewport.zoom}
          />
        ))}
      </div>

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
