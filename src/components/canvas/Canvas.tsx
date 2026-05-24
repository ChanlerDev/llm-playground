import { useRef, useCallback } from 'react'
import { useGesture } from '@use-gesture/react'
import type { Viewport, MessagesBlock, Connection, Position } from '@/types/canvas'
import { CanvasBlock } from './CanvasBlock'
import { ConnectionsLayer } from './ConnectionsLayer'
import type { Message } from '@/types/provider'

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

  // Connection drawing state
  const connectionStartRef = useRef<string | null>(null)

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], event, pinching }) => {
        if (pinching) return
        // Don't pan if dragging a block
        if (isDraggingBlock.current) return
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

  const handleBlockDragStart = useCallback(() => {
    isDraggingBlock.current = true
  }, [])

  const handleBlockDragEnd = useCallback(() => {
    isDraggingBlock.current = false
  }, [])

  // Connection port handling
  const handleConnectionStart = useCallback((blockId: string) => {
    connectionStartRef.current = blockId
  }, [])

  const handleConnectionEnd = useCallback(
    (blockId: string) => {
      const fromId = connectionStartRef.current
      if (fromId && fromId !== blockId) {
        onAddConnection(fromId, blockId)
      }
      connectionStartRef.current = null
    },
    [onAddConnection],
  )

  // Dot grid background pattern
  const dotGridStyle = {
    backgroundImage: `radial-gradient(circle, var(--hairline) ${DOT_SIZE}px, transparent ${DOT_SIZE}px)`,
    backgroundSize: `${DOT_SPACING * viewport.zoom}px ${DOT_SPACING * viewport.zoom}px`,
    backgroundPosition: `${viewport.x % (DOT_SPACING * viewport.zoom)}px ${viewport.y % (DOT_SPACING * viewport.zoom)}px`,
  }

  return (
    <div
      ref={containerRef}
      {...bind()}
      className="canvas-bg relative h-full w-full touch-none overflow-hidden bg-canvas"
      style={dotGridStyle}
      onDoubleClick={handleDoubleClick}
    >
      {/* SVG connections layer */}
      <ConnectionsLayer
        connections={connections}
        blocks={blocks}
        viewport={viewport}
        onDeleteConnection={onDeleteConnection}
        onUpdateConnection={onUpdateConnection}
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
            onConnectionStart={() => handleConnectionStart(block.id)}
            onConnectionEnd={() => handleConnectionEnd(block.id)}
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
