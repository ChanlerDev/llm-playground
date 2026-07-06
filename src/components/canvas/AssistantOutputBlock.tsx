import { Loader2, MessageCircle } from 'lucide-react'
import type { AssistantOutputBlock as AssistantOutputBlockModel } from '@/types/canvas'

interface AssistantOutputBlockProps {
  block: AssistantOutputBlockModel
}

export function AssistantOutputBlock({ block }: AssistantOutputBlockProps) {
  return (
    <div
      className="absolute select-none rounded-lg border border-primary/50 bg-surface-card shadow-none"
      style={{
        left: block.position.x,
        top: block.position.y,
        width: 320,
        minHeight: 80,
      }}
    >
      <div className="flex items-center gap-2 border-b border-hairline-soft px-2 py-1.5">
        {block.status === 'streaming' ? (
          <Loader2 className="size-3.5 animate-spin text-primary" />
        ) : (
          <MessageCircle className="size-3.5 text-primary" />
        )}
        <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink">
          {block.title}
        </span>
        <span className="rounded-pill bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
          {block.status}
        </span>
      </div>
      <div className="max-h-[260px] overflow-y-auto p-3" data-scrollable>
        <div className="whitespace-pre-wrap text-body-sm text-body">
          {block.content || (
            <span className="italic text-muted-soft">Waiting for response...</span>
          )}
          {block.status === 'streaming' && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-blink bg-primary align-middle" />
          )}
        </div>
      </div>
    </div>
  )
}
