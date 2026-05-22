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
  if (ms == null) return '—'
  return `${Math.round(ms)}ms`
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms > 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

function formatTokens(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

function formatSpeed(n: number | null): string {
  if (n == null) return '—'
  return `${n.toFixed(1)} t/s`
}

function formatChunks(n: number): string {
  if (n === 0) return '—'
  return n.toLocaleString()
}

interface StatItemProps {
  label: string
  value: string
  icon: React.ReactNode
  isLoading: boolean
}

function StatItem({ label, value, icon, isLoading }: StatItemProps) {
  const prevValueRef = useRef(value)
  const _highlightRef = useRef(false)

  useEffect(() => {
    if (prevValueRef.current !== value && value !== '—') {
      _highlightRef.current = true
      const timer = setTimeout(() => {
        _highlightRef.current = false
      }, 600)
      prevValueRef.current = value
      return () => clearTimeout(timer)
    }
  }, [value])

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 transition-opacity duration-300',
        isLoading && 'animate-subtle-pulse',
      )}
    >
      <span className="text-muted-soft">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-xs font-medium text-ink',
          value === '—' && 'text-muted-soft',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function StatsDashboard({ stats, isLoading }: StatsDashboardProps) {
  const statItems = [
    { label: 'TTFB', value: formatTtfb(stats.ttfb), icon: <Zap className="size-3" /> },
    { label: 'Duration', value: formatDuration(stats.totalDuration), icon: <Timer className="size-3" /> },
    { label: 'In', value: formatTokens(stats.promptTokens), icon: <MessageSquare className="size-3" /> },
    { label: 'Out', value: formatTokens(stats.completionTokens), icon: <MessageSquare className="size-3" /> },
    { label: 'Total', value: formatTokens(stats.totalTokens), icon: <Hash className="size-3" /> },
    { label: 'Speed', value: formatSpeed(stats.tokensPerSecond), icon: <Gauge className="size-3" /> },
    { label: 'Chunks', value: formatChunks(stats.chunkCount), icon: <Layers className="size-3" /> },
  ]

  return (
    <div className="flex flex-wrap items-center gap-4">
      {statItems.map((item) => (
        <StatItem
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
