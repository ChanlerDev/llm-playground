import { useRef, useEffect } from 'react'
import {
  Timer,
  Zap,
  MessageSquare,
  Hash,
  Gauge,
  Layers,
} from 'lucide-react'
import type { RequestStats } from '@/types/provider'
import { cn } from '@/lib/utils'

interface StatsDashboardProps {
  stats: RequestStats
  isLoading: boolean
}

function formatTtfb(ms: number | null): string {
  if (ms == null) return '\u2014'
  return `${Math.round(ms)}ms`
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '\u2014'
  if (ms > 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

function formatTokens(n: number | null): string {
  if (n == null) return '\u2014'
  return n.toLocaleString()
}

function formatSpeed(n: number | null): string {
  if (n == null) return '\u2014'
  return `${n.toFixed(1)} tok/s`
}

function formatChunks(n: number): string {
  if (n === 0) return '\u2014'
  return n.toLocaleString()
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  isLoading: boolean
}

function StatCard({ label, value, icon, isLoading }: StatCardProps) {
  const prevValueRef = useRef(value)
  const highlightRef = useRef(false)

  useEffect(() => {
    if (prevValueRef.current !== value && value !== '\u2014') {
      highlightRef.current = true
      const timer = setTimeout(() => {
        highlightRef.current = false
      }, 600)
      prevValueRef.current = value
      return () => clearTimeout(timer)
    }
  }, [value])

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 transition-all duration-300',
        isLoading && 'animate-pulse',
      )}
    >
      <div className="shrink-0 text-zinc-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <p
          className={cn(
            'font-mono text-sm font-semibold text-zinc-200 transition-colors duration-300',
            value === '\u2014' && 'text-zinc-600',
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

export function StatsDashboard({ stats, isLoading }: StatsDashboardProps) {
  const statItems = [
    {
      label: 'TTFB',
      value: formatTtfb(stats.ttfb),
      icon: <Zap className="size-3.5" />,
    },
    {
      label: 'Duration',
      value: formatDuration(stats.totalDuration),
      icon: <Timer className="size-3.5" />,
    },
    {
      label: 'Prompt',
      value: formatTokens(stats.promptTokens),
      icon: <MessageSquare className="size-3.5" />,
    },
    {
      label: 'Completion',
      value: formatTokens(stats.completionTokens),
      icon: <MessageSquare className="size-3.5" />,
    },
    {
      label: 'Total',
      value: formatTokens(stats.totalTokens),
      icon: <Hash className="size-3.5" />,
    },
    {
      label: 'Speed',
      value: formatSpeed(stats.tokensPerSecond),
      icon: <Gauge className="size-3.5" />,
    },
    {
      label: 'Chunks',
      value: formatChunks(stats.chunkCount),
      icon: <Layers className="size-3.5" />,
    },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {statItems.map((item) => (
        <StatCard
          key={item.label}
          label={item.label}
          value={item.value}
          icon={item.icon}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}
