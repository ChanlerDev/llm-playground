import { useMemo } from 'react'
import { Star } from 'lucide-react'
import type { SSEChunk } from '@/types/provider'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface TimelineProps {
  chunks: SSEChunk[]
  totalDuration: number | null
  onChunkSelect?: (chunkId: string) => void
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

/** Interpolate between two hex colors based on t (0..1) */
function lerpColor(t: number): string {
  // From blue (#3b82f6) to green (#22c55e)
  const r = Math.round(59 + (34 - 59) * t)
  const g = Math.round(130 + (197 - 130) * t)
  const b = Math.round(246 + (94 - 246) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function isDoneChunk(chunk: SSEChunk): boolean {
  return (
    chunk.eventType === 'message_stop' ||
    chunk.raw.includes('[DONE]')
  )
}

function generateTickMarks(duration: number): number[] {
  if (duration <= 0) return [0]
  // Choose interval: 50ms, 100ms, 200ms, 500ms, 1000ms depending on duration
  let interval: number
  if (duration <= 500) interval = 50
  else if (duration <= 1000) interval = 100
  else if (duration <= 3000) interval = 200
  else if (duration <= 10000) interval = 500
  else interval = 1000

  const ticks: number[] = [0]
  let t = interval
  while (t < duration) {
    ticks.push(t)
    t += interval
  }
  return ticks
}

export function Timeline({ chunks, totalDuration, onChunkSelect }: TimelineProps) {
  const duration = totalDuration ?? (chunks.length > 0 ? chunks[chunks.length - 1].timestamp : 0)
  const ticks = useMemo(() => generateTickMarks(duration), [duration])

  if (chunks.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-zinc-500">
        <p className="text-xs">Timeline appears during streaming</p>
      </div>
    )
  }

  // Minimum width to ensure scrollability for many chunks
  const minWidth = Math.max(600, chunks.length * 8)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
      <ScrollArea className="w-full">
        <div style={{ minWidth: `${minWidth}px` }} className="px-4 pb-2 pt-4">
          {/* Timeline bar */}
          <TooltipProvider>
            <div className="relative h-8">
              {/* Track line */}
              <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-zinc-700" />

              {/* Chunk dots */}
              {chunks.map((chunk, i) => {
                const t = duration > 0 ? chunk.timestamp / duration : 0
                const pct = t * 100
                const color = lerpColor(t)
                const hasContent = Boolean(chunk.deltaContent)
                const done = isDoneChunk(chunk)

                return (
                  <Tooltip key={chunk.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                          done ? 'flex items-center justify-center' : '',
                        )}
                        style={{
                          left: `${pct}%`,
                          width: done ? '16px' : hasContent ? '8px' : '5px',
                          height: done ? '16px' : hasContent ? '8px' : '5px',
                          backgroundColor: done ? 'transparent' : color,
                        }}
                        onClick={() => onChunkSelect?.(chunk.id)}
                      >
                        {done && (
                          <Star
                            className="size-4"
                            style={{ color, fill: color }}
                          />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8} className="max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold">
                            #{i}
                          </span>
                          <span className="font-mono text-xs text-zinc-400">
                            +{Math.round(chunk.timestamp)}ms
                          </span>
                        </div>
                        {chunk.eventType && (
                          <p className="text-xs text-zinc-400">
                            {chunk.eventType}
                          </p>
                        )}
                        {chunk.deltaContent && (
                          <p className="font-mono text-xs">
                            {truncate(chunk.deltaContent, 80)}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>

          {/* X-axis tick labels */}
          <div className="relative h-4">
            {ticks.map((tick) => {
              const pct = duration > 0 ? (tick / duration) * 100 : 0
              return (
                <span
                  key={tick}
                  className="absolute -translate-x-1/2 font-mono text-[10px] text-zinc-600"
                  style={{ left: `${pct}%` }}
                >
                  {tick >= 1000 ? `${(tick / 1000).toFixed(1)}s` : `${tick}ms`}
                </span>
              )
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
