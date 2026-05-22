import { useMemo } from 'react'
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

function isDoneChunk(chunk: SSEChunk): boolean {
  return (
    chunk.eventType === 'message_stop' ||
    chunk.raw.includes('[DONE]')
  )
}

function generateTickMarks(duration: number): number[] {
  if (duration <= 0) return [0]
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

/** Timeline pill colors from Cursor design system */
function getChunkColor(chunk: SSEChunk, t: number): string {
  if (isDoneChunk(chunk)) return 'var(--timeline-done)'
  if (t < 0.2) return 'var(--timeline-thinking)'
  if (t < 0.4) return 'var(--timeline-grep)'
  if (t < 0.7) return 'var(--timeline-read)'
  return 'var(--timeline-edit)'
}

export function Timeline({ chunks, totalDuration, onChunkSelect }: TimelineProps) {
  const duration = totalDuration ?? (chunks.length > 0 ? chunks[chunks.length - 1].timestamp : 0)
  const ticks = useMemo(() => generateTickMarks(duration), [duration])

  if (chunks.length === 0) {
    return (
      <div className="flex items-center justify-center py-2 text-muted">
        <p className="text-[13px]">Timeline appears during streaming</p>
      </div>
    )
  }

  const minWidth = Math.max(600, chunks.length * 8)

  return (
    <div className="rounded-lg border border-hairline bg-surface-card">
      <ScrollArea className="w-full">
        <div style={{ minWidth: `${minWidth}px` }} className="px-4 pb-2 pt-3">
          <TooltipProvider>
            <div className="relative h-7">
              {/* Track */}
              <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-hairline-strong" />

              {/* Chunks */}
              {chunks.map((chunk, i) => {
                const t = duration > 0 ? chunk.timestamp / duration : 0
                const pct = t * 100
                const hasContent = Boolean(chunk.deltaContent)
                const done = isDoneChunk(chunk)
                const color = getChunkColor(chunk, t)

                return (
                  <Tooltip key={chunk.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-[1.8] focus:outline-none',
                        )}
                        style={{
                          left: `${pct}%`,
                          width: done ? '10px' : hasContent ? '6px' : '4px',
                          height: done ? '10px' : hasContent ? '6px' : '4px',
                          backgroundColor: color,
                        }}
                        onClick={() => onChunkSelect?.(chunk.id)}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8} className="max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-ink">#{i}</span>
                          <span className="font-mono text-xs text-muted">
                            +{Math.round(chunk.timestamp)}ms
                          </span>
                        </div>
                        {chunk.eventType && (
                          <p className="text-xs text-body">{chunk.eventType}</p>
                        )}
                        {chunk.deltaContent && (
                          <p className="font-mono text-xs text-ink">{truncate(chunk.deltaContent, 80)}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>

          {/* Tick marks */}
          <div className="relative h-4">
            {ticks.map((tick) => {
              const pct = duration > 0 ? (tick / duration) * 100 : 0
              return (
                <span
                  key={tick}
                  className="absolute -translate-x-1/2 font-mono text-[10px] text-muted-soft"
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
