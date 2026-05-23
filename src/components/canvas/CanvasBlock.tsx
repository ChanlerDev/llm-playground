import { useRef, useCallback, useState } from 'react'
import { Copy, Trash2, GripVertical, ChevronDown, ChevronRight, Plus, Link, Send, Square } from 'lucide-react'
import type { MessagesBlock, Position } from '@/types/canvas'
import type { Message } from '@/types/provider'
import { Button } from '@/components/ui/button'

const ROLE_COLORS: Record<string, string> = {
  system: 'border-l-timeline-thinking',
  user: 'border-l-timeline-read',
  assistant: 'border-l-timeline-edit',
  tool: 'border-l-timeline-grep',
}

interface CanvasBlockProps {
  block: MessagesBlock
  isActive: boolean
  isLoading: boolean
  onSelect: () => void
  onMove: (position: Position) => void
  onUpdate: (patch: Partial<MessagesBlock>) => void
  onDelete: () => void
  onDuplicate: () => void
  onMessagesChange: (messages: Message[]) => void
  onSystemPromptChange: (systemPrompt: string) => void
  onSend: () => void
  onAbort: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onConnectionStart: () => void
  onConnectionEnd: () => void
  zoom: number
}

export function CanvasBlock({
  block,
  isActive,
  isLoading,
  onSelect,
  onMove,
  onUpdate,
  onDelete,
  onDuplicate,
  onMessagesChange,
  onSystemPromptChange,
  onSend,
  onAbort,
  onDragStart,
  onDragEnd,
  onConnectionStart,
  onConnectionEnd,
  zoom,
}: CanvasBlockProps) {
  const dragRef = useRef<{ startX: number; startY: number; blockX: number; blockY: number } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only drag from header grip area
      const target = e.target as HTMLElement
      if (!target.closest('[data-drag-handle]')) return
      e.preventDefault()
      e.stopPropagation()
      onDragStart()
      onSelect()
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        blockX: block.position.x,
        blockY: block.position.y,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [block.position, onDragStart, onSelect],
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
      const newTitle = e.target.value.trim()
      if (newTitle) {
        onUpdate({ title: newTitle })
      }
      setIsEditing(false)
    },
    [onUpdate],
  )

  const addMessage = useCallback(
    (role: string = 'user') => {
      onMessagesChange([...block.messages, { role, content: '' }])
    },
    [block.messages, onMessagesChange],
  )

  const updateMessage = useCallback(
    (idx: number, patch: Partial<Message>) => {
      const updated = block.messages.map((m, i) => (i === idx ? { ...m, ...patch } : m))
      onMessagesChange(updated)
    },
    [block.messages, onMessagesChange],
  )

  const deleteMessage = useCallback(
    (idx: number) => {
      onMessagesChange(block.messages.filter((_, i) => i !== idx))
    },
    [block.messages, onMessagesChange],
  )

  const borderClass = isActive ? 'border-primary' : 'border-hairline'

  return (
    <div
      className={`absolute select-none rounded-lg border bg-surface-card shadow-none ${borderClass}`}
      style={{
        left: block.position.x,
        top: block.position.y,
        width: 320,
        minHeight: 60,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1 border-b border-hairline-soft px-2 py-1.5"
        data-drag-handle
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-soft" data-drag-handle />

        {/* Collapse toggle */}
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

        {/* Title */}
        {isEditing ? (
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
            className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink cursor-text"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            {block.title}
          </span>
        )}

        {/* Badges */}
        <span className="shrink-0 rounded-pill bg-surface-strong px-1.5 py-0.5 text-[10px] text-muted">
          {block.messages.length}
        </span>
        {isActive && (
          <span className="shrink-0 rounded-pill bg-primary px-1.5 py-0.5 text-[10px] text-on-primary">
            Active
          </span>
        )}

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            className="rounded p-0.5 text-muted hover:bg-canvas-soft hover:text-ink"
            onClick={(e) => {
              e.stopPropagation()
              onConnectionStart()
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

      {/* Body */}
      {!block.isCollapsed && (
        <>
          {/* Scrollable messages area */}
          <div className="max-h-[400px] overflow-y-auto p-2" data-scrollable>
            {/* System prompt */}
            {(block.systemPrompt || editingMessageIdx === -1) && (
              <div className="mb-2 rounded border-l-2 border-l-timeline-thinking bg-canvas-soft p-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-soft">
                  system
                </div>
                <textarea
                  className="w-full resize-none bg-transparent text-body-sm text-ink outline-none placeholder:text-muted-soft"
                  value={block.systemPrompt}
                  onChange={(e) => onSystemPromptChange(e.target.value)}
                  placeholder="System prompt..."
                  rows={2}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Messages */}
            {block.messages.map((msg, idx) => (
              <div
                key={idx}
                className={`group mb-1.5 rounded border-l-2 p-2 ${ROLE_COLORS[msg.role] ?? 'border-l-hairline'} hover:bg-canvas-soft`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <select
                    className="bg-transparent text-[10px] font-medium uppercase tracking-wider text-muted-soft outline-none"
                    value={msg.role}
                    onChange={(e) => {
                      e.stopPropagation()
                      updateMessage(idx, { role: e.target.value })
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="user">user</option>
                    <option value="assistant">assistant</option>
                    <option value="system">system</option>
                    <option value="tool">tool</option>
                  </select>
                  <button
                    className="hidden rounded p-0.5 text-muted hover:text-semantic-error group-hover:block"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMessage(idx)
                    }}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                {editingMessageIdx === idx ? (
                  <textarea
                    className="w-full resize-none bg-transparent text-body-sm text-ink outline-none placeholder:text-muted-soft"
                    value={msg.content}
                    onChange={(e) => {
                      e.stopPropagation()
                      updateMessage(idx, { content: e.target.value })
                    }}
                    onBlur={() => setEditingMessageIdx(null)}
                    autoFocus
                    rows={3}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    className="cursor-text whitespace-pre-wrap text-body-sm text-body"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingMessageIdx(idx)
                    }}
                  >
                    {msg.content || (
                      <span className="italic text-muted-soft">Click to edit...</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Fixed footer — always visible */}
          <div className="flex items-center gap-1 border-t border-hairline-soft px-2 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-1 text-muted"
              onClick={(e) => {
                e.stopPropagation()
                addMessage()
              }}
            >
              <Plus className="size-3" />
              Add message
            </Button>

            {/* Send button */}
            {isLoading ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-semantic-error text-semantic-error"
                onClick={(e) => {
                  e.stopPropagation()
                  onAbort()
                }}
              >
                <Square className="size-3" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onSend()
                }}
              >
                <Send className="size-3" />
                Send
              </Button>
            )}
          </div>
        </>
      )}

      {/* Connection drop target */}
      <div
        className="absolute inset-0 z-[-1]"
        onPointerUp={(e) => {
          e.stopPropagation()
          onConnectionEnd()
        }}
      />
    </div>
  )
}
