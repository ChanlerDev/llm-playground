import { Plus, X } from 'lucide-react'
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
  messages: Message[]
  setMessages: (messages: Message[]) => void
  provider: ProviderType
}

const ROLE_BORDER_COLORS: Record<string, string> = {
  system: 'border-l-purple-500',
  user: 'border-l-blue-500',
  assistant: 'border-l-green-500',
  tool: 'border-l-orange-500',
}

const ROLE_LABELS: Record<string, string> = {
  system: 'System',
  user: 'User',
  assistant: 'Assistant',
  tool: 'Tool',
}

export function MessageEditor({ messages, setMessages, provider }: MessageEditorProps) {
  const roles = provider === 'openai'
    ? ['system', 'user', 'assistant', 'tool']
    : ['system', 'user', 'assistant']

  function updateMessage(index: number, patch: Partial<Message>) {
    const updated = messages.map((msg, i) =>
      i === index ? { ...msg, ...patch } : msg,
    )
    setMessages(updated)
  }

  function removeMessage(index: number) {
    setMessages(messages.filter((_, i) => i !== index))
  }

  function addMessage() {
    setMessages([...messages, { role: 'user', content: '' }])
  }

  return (
    <div className="space-y-3">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`relative rounded-lg border-l-[3px] bg-zinc-800/50 p-3 ${ROLE_BORDER_COLORS[msg.role] ?? 'border-l-zinc-500'}`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
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

            <Button
              variant="ghost"
              size="icon-xs"
              className="text-zinc-500 hover:text-red-400"
              onClick={() => removeMessage(index)}
            >
              <X className="size-3.5" />
            </Button>
          </div>

          <Textarea
            value={msg.content}
            onChange={(e) => updateMessage(index, { content: e.target.value })}
            placeholder="Enter message content..."
            className="min-h-[60px] resize-none border-zinc-700 bg-zinc-900/40 text-sm"
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
