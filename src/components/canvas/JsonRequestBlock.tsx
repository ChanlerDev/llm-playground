import { useCallback, useRef, useState } from 'react'
import {
  AlertTriangle,
  Braces,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Link,
  Trash2,
} from 'lucide-react'
import type { JsonRequestBlock as JsonRequestBlockModel, Position } from '@/types/canvas'
import { parseJsonRequestBlock } from '@/services/request-block'
import type { ConnectionMode } from './Canvas'

interface JsonRequestBlockProps {
  block: JsonRequestBlockModel
  isConnectionTarget: boolean
  connectionMode: ConnectionMode
  onMove: (position: Position) => void
  onUpdate: (patch: Partial<JsonRequestBlockModel>) => void
  onDelete: () => void
  onDuplicate: () => void
  onJsonChange: (json: string) => void
  onDragStart: () => void
  onDragEnd: () => void
  onConnectionButtonStart: () => void
  onPortDragStart: (clientX: number, clientY: number) => void
  onBlockHover: (entering: boolean) => void
  onBlockClickForConnection: () => void
  zoom: number
}

export function JsonRequestBlock({
  block,
  isConnectionTarget,
  connectionMode,
  onMove,
  onUpdate,
  onDelete,
  onDuplicate,
  onJsonChange,
  onDragStart,
  onDragEnd,
  onConnectionButtonStart,
  onPortDragStart,
  onBlockHover,
  onBlockClickForConnection,
  zoom,
}: JsonRequestBlockProps) {
  const dragRef = useRef<{ startX: number; startY: number; blockX: number; blockY: number } | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  const parseResult = parseJsonRequestBlock(block.json)
  const isInConnectionMode = connectionMode.type !== 'idle'
  const isSourceBlock = isInConnectionMode && connectionMode.fromBlockId === block.id

  const borderClass = isConnectionTarget
    ? 'border-primary ring-2 ring-primary/30'
    : isSourceBlock
      ? 'border-primary/50'
      : parseResult.ok
        ? 'border-hairline'
        : 'border-semantic-error'

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
      onMove({
        x: dragRef.current.blockX + dx,
        y: dragRef.current.blockY + dy,
      })
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

  const handleTitleChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const title = e.target.value.trim()
      if (title) onUpdate({ title })
      setIsEditingTitle(false)
    },
    [onUpdate],
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
      className={`group/block absolute select-none rounded-lg border bg-surface-card shadow-none transition-[border-color,box-shadow] duration-150 ${borderClass}`}
      style={{
        left: block.position.x,
        top: block.position.y,
        width: 360,
        minHeight: 60,
      }}
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
        <button
          className="shrink-0 text-muted hover:text-ink"
          onClick={(e) => {
            e.stopPropagation()
            onUpdate({ isCollapsed: !block.isCollapsed })
          }}
        >
          {block.isCollapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
        <Braces className="size-3.5 shrink-0 text-primary" />

        {isEditingTitle ? (
          <input
            className="min-w-0 flex-1 bg-transparent text-body-sm font-medium text-ink outline-none"
            defaultValue={block.title}
            autoFocus
            onBlur={handleTitleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="min-w-0 flex-1 cursor-text truncate text-body-sm font-medium text-ink"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setIsEditingTitle(true)
            }}
          >
            {block.title}
          </span>
        )}

        <span className="shrink-0 rounded-pill bg-surface-strong px-1.5 py-0.5 text-[10px] text-muted">
          JSON
        </span>

        <div className="flex shrink-0 items-center gap-0.5">
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
      </div>

      {!block.isCollapsed && (
        <>
          <div className="max-h-[360px] overflow-y-auto p-2" data-scrollable>
            <textarea
              className="min-h-[220px] w-full resize-y rounded border border-hairline bg-canvas-soft p-2 font-mono text-[12px] leading-5 text-ink outline-none placeholder:text-muted-soft focus:border-primary"
              value={block.json}
              spellCheck={false}
              onChange={(e) => onJsonChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>

          <div className="border-t border-hairline-soft px-2 py-1.5">
            {parseResult.ok ? (
              <div className="text-[11px] text-muted">Applies request fields except messages.</div>
            ) : (
              <div className="flex items-start gap-1.5 text-[11px] text-semantic-error">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span className="min-w-0 break-words">{parseResult.error}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
