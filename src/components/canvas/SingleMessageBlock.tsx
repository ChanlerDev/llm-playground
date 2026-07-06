import { useCallback, useRef, useState } from 'react'
import {
  Copy,
  GripVertical,
  Link,
  Trash2,
} from 'lucide-react'
import type { Position, SingleMessageBlock as SingleMessageBlockModel } from '@/types/canvas'
import type { Message } from '@/types/provider'
import type { ConnectionMode } from './Canvas'

const ROLE_COLORS: Record<string, string> = {
  system: 'border-l-timeline-thinking',
  user: 'border-l-timeline-read',
  assistant: 'border-l-timeline-edit',
  tool: 'border-l-timeline-grep',
}

interface SingleMessageBlockProps {
  block: SingleMessageBlockModel
  isConnectionTarget: boolean
  connectionMode: ConnectionMode
  onMove: (position: Position) => void
  onUpdate: (patch: Partial<SingleMessageBlockModel>) => void
  onDelete: () => void
  onDuplicate: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onConnectionButtonStart: () => void
  onPortDragStart: (clientX: number, clientY: number) => void
  onBlockHover: (entering: boolean) => void
  onBlockClickForConnection: () => void
  onMessageDragStart: (messageIndex: number, clientX: number, clientY: number) => void
  zoom: number
}

export function SingleMessageBlock({
  block,
  isConnectionTarget,
  connectionMode,
  onMove,
  onUpdate,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragEnd,
  onConnectionButtonStart,
  onPortDragStart,
  onBlockHover,
  onBlockClickForConnection,
  onMessageDragStart,
  zoom,
}: SingleMessageBlockProps) {
  const dragRef = useRef<{ startX: number; startY: number; blockX: number; blockY: number } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const isInConnectionMode = connectionMode.type !== 'idle'
  const isSourceBlock = isInConnectionMode && connectionMode.fromBlockId === block.id
  const borderClass = isConnectionTarget
    ? 'border-primary ring-2 ring-primary/30'
    : isSourceBlock
      ? 'border-primary/50'
      : 'border-hairline'

  const updateMessage = useCallback(
    (patch: Partial<Message>) => {
      const message = { ...block.message, ...patch }
      onUpdate({ message, title: message.role })
    },
    [block.message, onUpdate],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-drag-handle]')) return
      e.preventDefault()
      e.stopPropagation()
      onDragStart()
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        blockX: block.position.x,
        blockY: block.position.y,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [block.position, onDragStart],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      const dx = (e.clientX - dragRef.current.startX) / zoom
      const dy = (e.clientY - dragRef.current.startY) / zoom
      onMove({ x: dragRef.current.blockX + dx, y: dragRef.current.blockY + dy })
    },
    [zoom, onMove],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      dragRef.current = null
      onDragEnd()
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    },
    [onDragEnd],
  )

  const handlePortPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onPortDragStart(e.clientX, e.clientY)
    },
    [onPortDragStart],
  )

  const handleBlockClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (connectionMode.type === 'button' && connectionMode.fromBlockId !== block.id) {
        onBlockClickForConnection()
      }
    },
    [connectionMode, block.id, onBlockClickForConnection],
  )

  return (
    <div
      className={`group/block absolute select-none rounded-lg border border-l-2 bg-surface-card shadow-none transition-[border-color,box-shadow] duration-150 ${ROLE_COLORS[block.message.role] ?? 'border-l-hairline'} ${borderClass}`}
      style={{ left: block.position.x, top: block.position.y, width: 280, minHeight: 84 }}
      onClick={handleBlockClick}
      onPointerEnter={() => onBlockHover(true)}
      onPointerLeave={() => onBlockHover(false)}
    >
      <div
        className="absolute left-0 top-[18px] z-10 -translate-x-1/2 opacity-0 transition-opacity group-hover/block:opacity-100"
        onPointerDown={handlePortPointerDown}
      >
        <div className="flex h-4 w-4 cursor-crosshair items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-muted bg-surface-card transition-colors hover:border-primary hover:bg-primary/20" />
        </div>
      </div>
      <div
        className="absolute right-0 top-[18px] z-10 translate-x-1/2 opacity-0 transition-opacity group-hover/block:opacity-100"
        onPointerDown={handlePortPointerDown}
      >
        <div className="flex h-4 w-4 cursor-crosshair items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-muted bg-surface-card transition-colors hover:border-primary hover:bg-primary/20" />
        </div>
      </div>

      <div
        className="flex items-center gap-1 border-b border-hairline-soft px-2 py-1.5"
        data-drag-handle
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-soft" data-drag-handle />
        <GripVertical
          className="size-3 shrink-0 cursor-grab text-muted-soft active:cursor-grabbing"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMessageDragStart(0, e.clientX, e.clientY)
          }}
        />
        <select
          className="min-w-0 flex-1 bg-transparent text-[10px] font-medium uppercase tracking-wider text-muted-soft outline-none"
          value={block.message.role}
          onChange={(e) => {
            e.stopPropagation()
            updateMessage({ role: e.target.value })
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="user">user</option>
          <option value="assistant">assistant</option>
          <option value="system">system</option>
          <option value="tool">tool</option>
        </select>
        <button
          className="rounded p-0.5 text-muted hover:bg-canvas-soft hover:text-ink"
          onClick={(e) => {
            e.stopPropagation()
            onConnectionButtonStart()
          }}
          title="Draw connection"
        >
          <Link className="size-3" />
        </button>
        <button
          className="rounded p-0.5 text-muted hover:bg-canvas-soft hover:text-ink"
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate()
          }}
          title="Duplicate"
        >
          <Copy className="size-3" />
        </button>
        <button
          className="rounded p-0.5 text-muted hover:bg-canvas-soft hover:text-semantic-error"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          title="Delete"
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto p-2" data-scrollable>
        {isEditing ? (
          <textarea
            className="w-full resize-none bg-transparent text-body-sm text-ink outline-none placeholder:text-muted-soft"
            value={block.message.content}
            onChange={(e) => {
              e.stopPropagation()
              updateMessage({ content: e.target.value })
            }}
            onBlur={() => setIsEditing(false)}
            autoFocus
            rows={4}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="cursor-text whitespace-pre-wrap break-words text-body-sm text-body"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            {block.message.content || (
              <span className="italic text-muted-soft">Click to edit...</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
