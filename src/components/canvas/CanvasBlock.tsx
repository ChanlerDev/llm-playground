import { useRef, useCallback, useState } from 'react'
import { Copy, Trash2, GripVertical, ChevronDown, ChevronRight, Plus, Link, Send, Square } from 'lucide-react'
import type { MessagesBlock, Position } from '@/types/canvas'
import type { Message } from '@/types/provider'
import { Button } from '@/components/ui/button'
import type { ConnectionMode } from './Canvas'

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
  isConnectionTarget: boolean
  connectionMode: ConnectionMode
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
  onConnectionButtonStart: () => void
  onPortDragStart: (clientX: number, clientY: number) => void
  onBlockHover: (entering: boolean) => void
  onBlockClickForConnection: () => void
  onMessageDragStart: (messageIndex: number, clientX: number, clientY: number) => void
  onMoveMessageToBlock: (sourceBlockId: string, messageIndex: number) => void
  attachedRequestTitle: string | null
  zoom: number
}

export function CanvasBlock({
  block,
  isActive,
  isLoading,
  isConnectionTarget,
  connectionMode,
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
  onConnectionButtonStart,
  onPortDragStart,
  onBlockHover,
  onBlockClickForConnection,
  onMessageDragStart,
  onMoveMessageToBlock,
  attachedRequestTitle,
  zoom,
}: CanvasBlockProps) {
  const dragRef = useRef<{ startX: number; startY: number; blockX: number; blockY: number } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
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

  const handleMessageDragStart = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.stopPropagation()
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData(
        'application/x-llm-message',
        JSON.stringify({ sourceBlockId: block.id, messageIndex: idx }),
      )
    },
    [block.id],
  )

  const handleMessageDrop = useCallback(
    (e: React.DragEvent) => {
      const raw = e.dataTransfer.getData('application/x-llm-message')
      if (!raw) return
      e.preventDefault()
      e.stopPropagation()
      try {
        const parsed = JSON.parse(raw) as { sourceBlockId?: string; messageIndex?: number }
        if (typeof parsed.sourceBlockId === 'string' && typeof parsed.messageIndex === 'number') {
          onMoveMessageToBlock(parsed.sourceBlockId, parsed.messageIndex)
        }
      } catch {
        // Ignore malformed drag payloads from outside the app.
      }
    },
    [onMoveMessageToBlock],
  )

  // Port drag start handler
  const handlePortPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onPortDragStart(e.clientX, e.clientY)
    },
    [onPortDragStart],
  )

  // Click handler — in button mode, this block is a target
  const handleBlockClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (connectionMode.type === 'button' && connectionMode.fromBlockId !== block.id) {
        onBlockClickForConnection()
        return
      }
      onSelect()
    },
    [connectionMode, block.id, onBlockClickForConnection, onSelect],
  )

  const isInConnectionMode = connectionMode.type !== 'idle'
  const isSourceBlock = isInConnectionMode && connectionMode.fromBlockId === block.id

  const borderClass = isConnectionTarget
    ? 'border-primary ring-2 ring-primary/30'
    : isSourceBlock
      ? 'border-primary/50'
      : isActive
        ? 'border-primary'
        : 'border-hairline'

  return (
    <div
      className={`group/block absolute select-none rounded-lg border bg-surface-card shadow-none transition-[border-color,box-shadow] duration-150 ${borderClass}`}
      style={{
        left: block.position.x,
        top: block.position.y,
        width: 320,
        minHeight: 60,
      }}
      onClick={handleBlockClick}
      onPointerEnter={() => onBlockHover(true)}
      onPointerLeave={() => onBlockHover(false)}
    >
      {/* Left port */}
      <div
        className="absolute left-0 top-[18px] z-10 -translate-x-1/2 opacity-0 transition-opacity group-hover/block:opacity-100"
        onPointerDown={handlePortPointerDown}
      >
        <div className="flex h-4 w-4 cursor-crosshair items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-muted bg-surface-card transition-colors hover:border-primary hover:bg-primary/20" />
        </div>
      </div>

      {/* Right port */}
      <div
        className="absolute right-0 top-[18px] z-10 translate-x-1/2 opacity-0 transition-opacity group-hover/block:opacity-100"
        onPointerDown={handlePortPointerDown}
      >
        <div className="flex h-4 w-4 cursor-crosshair items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-muted bg-surface-card transition-colors hover:border-primary hover:bg-primary/20" />
        </div>
      </div>

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
        {attachedRequestTitle && (
          <span className="min-w-0 max-w-[88px] shrink truncate rounded-pill bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
            {attachedRequestTitle}
          </span>
        )}

        {/* Actions */}
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

      {/* Body */}
      {!block.isCollapsed && (
        <>
          {/* Scrollable messages area */}
          <div
            className="max-h-[400px] overflow-y-auto p-2"
            data-scrollable
            data-message-drop-target
            onDrop={handleMessageDrop}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('application/x-llm-message')) e.preventDefault()
            }}
          >
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
                draggable
                onDragStart={(e) => handleMessageDragStart(e, idx)}
                className={`group mb-1.5 cursor-grab rounded border-l-2 p-2 ${ROLE_COLORS[msg.role] ?? 'border-l-hairline'} hover:bg-canvas-soft active:cursor-grabbing`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <GripVertical
                      className="size-3 cursor-grab text-muted-soft active:cursor-grabbing"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onMessageDragStart(idx, e.clientX, e.clientY)
                      }}
                    />
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
                  </div>
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
    </div>
  )
}
