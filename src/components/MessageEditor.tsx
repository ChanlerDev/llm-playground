import { Plus, X, Wrench, MessageSquare } from 'lucide-react'
import type { Message, ProviderType } from '@/types/provider'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MessageEditorProps {
  systemPrompt: string
  setSystemPrompt: (value: string) => void
  messages: Message[]
  setMessages: (messages: Message[]) => void
  provider: ProviderType
}

const ROLE_BORDER_COLORS: Record<string, string> = {
  user: 'border-l-primary',
  assistant: 'border-l-timeline-read',
  tool: 'border-l-timeline-grep',
}

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  assistant: 'Assistant',
  tool: 'Tool',
}

function ToolCallBadges({ message }: { message: Message }) {
  const calls = message.tool_calls ?? []
  const anthropicCalls = message.anthropic_tool_use ?? []
  const allCalls = [
    ...calls.map((tc) => ({ name: tc.function.name, id: tc.id })),
    ...anthropicCalls.map((tu) => ({ name: tu.name, id: tu.id })),
  ]

  if (allCalls.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {allCalls.map((tc) => (
        <span
          key={tc.id}
          className="inline-flex items-center gap-1 rounded-full bg-surface-strong px-2 py-0.5 font-mono text-[10px] text-ink"
        >
          <Wrench className="size-2.5" />
          {tc.name}
          <span className="text-muted">({tc.id.slice(-6)})</span>
        </span>
      ))}
    </div>
  )
}

function ToolCallIdBadge({ toolCallId }: { toolCallId?: string }) {
  if (!toolCallId) return null

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-strong px-2 py-0.5 font-mono text-[10px] text-muted">
      call_id: {toolCallId.slice(-8)}
    </span>
  )
}

export function MessageEditor({ systemPrompt, setSystemPrompt, messages, setMessages }: MessageEditorProps) {
  const roles = ['user', 'assistant', 'tool']

  function updateMessage(index: number, patch: Partial<Message>) {
    const updated = messages.map((msg, i) =>
      i === index ? { ...msg, ...patch } : msg,
    )
    setMessages(updated)
  }

  function removeMessage(index: number) {
    const msg = messages[index]

    if (msg.role === 'assistant') {
      const toolCallIds = new Set<string>()
      for (const tc of msg.tool_calls ?? []) {
        toolCallIds.add(tc.id)
      }
      for (const tu of msg.anthropic_tool_use ?? []) {
        toolCallIds.add(tu.id)
      }

      if (toolCallIds.size > 0) {
        setMessages(messages.filter((m, i) =>
          i !== index && !(m.role === 'tool' && m.tool_call_id && toolCallIds.has(m.tool_call_id))
        ))
        return
      }
    }

    setMessages(messages.filter((_, i) => i !== index))
  }

  function addMessage() {
    setMessages([...messages, { role: 'user', content: '' }])
  }

  return (
    <div className="space-y-3">
      {/* System prompt */}
      <div className="rounded-lg border border-hairline border-l-[3px] border-l-timeline-edit bg-surface-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <MessageSquare className="size-3 text-timeline-edit" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">System</span>
        </div>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Enter system prompt (optional)..."
          className="min-h-[60px] resize-none rounded-md border-hairline bg-canvas-soft text-sm text-ink"
          rows={2}
        />
      </div>

      {/* Messages */}
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`relative rounded-lg border border-hairline border-l-[3px] bg-surface-card p-3 ${ROLE_BORDER_COLORS[msg.role] ?? 'border-l-hairline-strong'}`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Select
                value={msg.role}
                onValueChange={(value) => updateMessage(index, { role: value })}
              >
                <SelectTrigger size="sm" className="w-[110px] rounded-md border-hairline bg-canvas-soft text-xs text-ink">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {msg.role === 'tool' && <ToolCallIdBadge toolCallId={msg.tool_call_id} />}
            </div>

            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted hover:text-semantic-error"
              onClick={() => removeMessage(index)}
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {msg.role === 'assistant' && <ToolCallBadges message={msg} />}

          <Textarea
            value={msg.content}
            onChange={(e) => updateMessage(index, { content: e.target.value })}
            placeholder={
              msg.role === 'tool'
                ? 'Enter tool result (JSON or text)...'
                : 'Enter message content...'
            }
            className="mt-2 min-h-[60px] resize-none rounded-md border-hairline bg-canvas-soft text-sm text-ink"
            rows={2}
          />
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-md border-dashed border-hairline-strong text-muted hover:text-ink hover:border-ink"
        onClick={addMessage}
      >
        <Plus className="size-3.5" />
        Add Message
      </Button>
    </div>
  )
}
