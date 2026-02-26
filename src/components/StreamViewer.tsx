import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronRight, ChevronDown, Radio } from 'lucide-react'
import type { SSEChunk } from '@/types/provider'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { JsonViewer } from '@/components/JsonViewer'
import { cn } from '@/lib/utils'

interface StreamViewerProps {
  chunks: SSEChunk[]
  isStreaming: boolean
}

function getChunkBorderClass(chunk: SSEChunk): string {
  // Error chunks: red border + red tint
  if (
    chunk.eventType === 'error' ||
    (chunk.parsed != null &&
      typeof chunk.parsed === 'object' &&
      'error' in (chunk.parsed as Record<string, unknown>))
  ) {
    return 'border-l-red-500 bg-red-950/20'
  }

  // Done/stop chunks: red border
  if (
    chunk.eventType === 'message_stop' ||
    chunk.raw.includes('[DONE]') ||
    chunk.eventType === 'message_delta'
  ) {
    return 'border-l-red-500'
  }

  // Content chunks: green border
  if (chunk.deltaContent) {
    return 'border-l-green-500'
  }

  // Metadata chunks: gray border
  return 'border-l-zinc-600'
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

function formatTimestamp(ms: number): string {
  if (ms < 1000) return `+${Math.round(ms)}ms`
  return `+${(ms / 1000).toFixed(2)}s`
}

function ChunkRow({ chunk, index }: { chunk: SSEChunk; index: number }) {
  const [open, setOpen] = useState(false)
  const borderClass = getChunkBorderClass(chunk)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'border-l-2 transition-colors',
          borderClass,
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-800/50 transition-colors"
            type="button"
          >
            {/* Left: index + timestamp */}
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant="secondary"
                className="h-5 min-w-[1.75rem] justify-center rounded bg-zinc-800 px-1 text-[10px] font-mono text-zinc-500"
              >
                {index}
              </Badge>
              <span className="w-[5.5rem] font-mono text-xs text-zinc-500">
                {formatTimestamp(chunk.timestamp)}
              </span>
            </div>

            {/* Center: event type badge + content preview */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {chunk.eventType && (
                <Badge
                  variant="outline"
                  className="shrink-0 rounded border-zinc-700 px-1.5 py-0 text-[10px] font-mono text-zinc-400"
                >
                  {chunk.eventType}
                </Badge>
              )}
              {chunk.deltaContent ? (
                <span className="min-w-0 truncate font-mono text-xs text-zinc-300">
                  {truncate(chunk.deltaContent, 60)}
                </span>
              ) : (
                <span className="min-w-0 truncate text-xs text-zinc-500 italic">
                  metadata
                </span>
              )}
            </div>

            {/* Right: expand toggle */}
            <div className="shrink-0 text-zinc-500">
              {open ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-zinc-800/50 px-3 py-2">
            <JsonViewer data={chunk.parsed} defaultExpanded={3} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function StreamViewer({ chunks, isStreaming }: StreamViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Auto-scroll when new chunks arrive during streaming
  useEffect(() => {
    if (isStreaming && chunks.length > 0) {
      scrollToBottom()
    }
  }, [chunks.length, isStreaming, scrollToBottom])

  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-zinc-500">
        <Radio className="size-5 text-zinc-600" />
        <p className="text-sm">Send a streaming request to see SSE events here</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-zinc-800/50">
        {chunks.map((chunk, i) => (
          <ChunkRow key={chunk.id} chunk={chunk} index={i} />
        ))}
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 px-3 py-2 text-zinc-500">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="text-xs">Streaming...</span>
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={bottomRef} />
    </ScrollArea>
  )
}
