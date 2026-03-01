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
  user: 'border-l-blue-500',
  assistant: 'border-l-green-500',
  tool: 'border-l-orange-500',
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
          className="inline-flex items-center gap-1 rounded bg-orange-950/50 px-1.5 py-0.5 font-mono text-[10px] text-orange-400 ring-1 ring-orange-800/50"
        >
          <Wrench className="size-2.5" />
          {tc.name}
          <span className="text-orange-600">({tc.id.slice(-6)})</span>
        </span>
      ))}
    </div>
  )
}

function ToolCallIdBadge({ toolCallId }: { toolCallId?: string }) {
  if (!toolCallId) return null

  return (
    <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 ring-1 ring-zinc-700">
      call_id: {toolCallId.slice(-8)}
    </span>
  )
}

export function MessageEditor({ systemPrompt, setSystemPrompt, messages, setMessages, provider: _provider }: MessageEditorProps) {
  const roles = ['user', 'assistant', 'tool']

  function updateMessage(index: number, patch: Partial<Message>) {
    const updated = messages.map((msg, i) =>
      i === index ? { ...msg, ...patch } : msg,
    )
    setMessages(updated)
  }

  function removeMessage(index: number) {
    const msg = messages[index]

    // If removing an assistant message with tool_calls, also remove associated tool result messages
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
      {/* Fixed system prompt at the top */}
      <div className="rounded-lg border-l-[3px] border-l-purple-500 bg-zinc-800/50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <MessageSquare className="size-3.5 text-purple-400" />
          <span className="text-xs font-medium text-purple-400">System</span>
        </div>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Enter system prompt (optional)..."
          className="min-h-[60px] resize-none border-zinc-700 bg-zinc-900/40 text-sm"
          rows={2}
        />
      </div>

      {/* Conversation messages */}
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`relative rounded-lg border-l-[3px] bg-zinc-800/50 p-3 ${ROLE_BORDER_COLORS[msg.role] ?? 'border-l-zinc-500'}`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Select
                value={msg.role}
                onValueChange={(value) => updateMessage(index, { role: value })}
              >
                <SelectTrigger size="sm" className="w-[120px] bg-zinc-900/60 text-xs">
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
              className="text-zinc-500 hover:text-red-400"
              onClick={() => removeMessage(index)}
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {/* Show tool_calls badges for assistant messages */}
          {msg.role === 'assistant' && <ToolCallBadges message={msg} />}

          <Textarea
            value={msg.content}
            onChange={(e) => updateMessage(index, { content: e.target.value })}
            placeholder={
              msg.role === 'tool'
                ? 'Enter tool result (JSON or text)...'
                : 'Enter message content...'
            }
            className="mt-2 min-h-[60px] resize-none border-zinc-700 bg-zinc-900/40 text-sm"
            rows={2}
          />
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200"
        onClick={addMessage}
      >
        <Plus className="size-3.5" />
        Add Message
      </Button>
    </div>
  )
}
