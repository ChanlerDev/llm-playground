import { useState, useCallback } from 'react'
import { Copy, Check, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface JsonViewerProps {
  data: unknown
  defaultExpanded?: number
}

export function JsonViewer({ data, defaultExpanded = 2 }: JsonViewerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [data])

  return (
    <div className="relative rounded-lg border border-hairline bg-canvas font-mono text-sm">
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute right-2 top-2 text-muted hover:text-ink"
        onClick={handleCopy}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
      <div className="overflow-auto p-4">
        <JsonNode data={data} depth={0} defaultExpanded={defaultExpanded} />
      </div>
    </div>
  )
}

interface JsonNodeProps {
  data: unknown
  depth: number
  defaultExpanded: number
  isLast?: boolean
  keyName?: string
}

function JsonNode({
  data,
  depth,
  defaultExpanded,
  isLast = true,
  keyName,
}: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < defaultExpanded)

  const comma = isLast ? '' : ','

  // Null
  if (data === null) {
    return (
      <span>
        {keyName !== undefined && (
          <>
            <span className="text-ink">{`"${keyName}"`}</span>
            <span className="text-muted">: </span>
          </>
        )}
        <span className="text-muted">null</span>
        {comma}
      </span>
    )
  }

  // Primitive types
  if (typeof data !== 'object') {
    return (
      <span>
        {keyName !== undefined && (
          <>
            <span className="text-ink">{`"${keyName}"`}</span>
            <span className="text-muted">: </span>
          </>
        )}
        <PrimitiveValue value={data as string | number | boolean} />
        {comma}
      </span>
    )
  }

  // Object or Array
  const isArray = Array.isArray(data)
  const entries = isArray
    ? (data as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(data as Record<string, unknown>)
  const openBrace = isArray ? '[' : '{'
  const closeBrace = isArray ? ']' : '}'
  const itemCount = entries.length
  const countLabel = isArray
    ? `${itemCount} item${itemCount !== 1 ? 's' : ''}`
    : `${itemCount} key${itemCount !== 1 ? 's' : ''}`

  if (itemCount === 0) {
    return (
      <span>
        {keyName !== undefined && (
          <>
            <span className="text-ink">{`"${keyName}"`}</span>
            <span className="text-muted">: </span>
          </>
        )}
        <span className="text-muted">
          {openBrace}{closeBrace}
        </span>
        {comma}
      </span>
    )
  }

  return (
    <div>
      <span
        className="cursor-pointer select-none hover:bg-canvas-soft"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="inline size-3.5 text-muted" />
        ) : (
          <ChevronRight className="inline size-3.5 text-muted" />
        )}
        {keyName !== undefined && (
          <>
            <span className="text-ink">{`"${keyName}"`}</span>
            <span className="text-muted">: </span>
          </>
        )}
        <span className="text-muted">{openBrace}</span>
        {!expanded && (
          <>
            <span className="text-muted-soft">
              {' ...'}
            </span>
            <span className="text-muted">{closeBrace}</span>
            <span className="ml-2 text-xs text-muted-soft">{countLabel}</span>
            {comma}
          </>
        )}
      </span>
      {expanded && (
        <>
          <div className={cn('ml-4 border-l border-hairline pl-3')}>
            {entries.map(([key, value], index) => (
              <div key={key}>
                <JsonNode
                  data={value}
                  depth={depth + 1}
                  defaultExpanded={defaultExpanded}
                  isLast={index === entries.length - 1}
                  keyName={isArray ? undefined : key}
                />
              </div>
            ))}
          </div>
          <span className="text-muted">
            {closeBrace}
          </span>
          {comma}
        </>
      )}
    </div>
  )
}

function PrimitiveValue({ value }: { value: string | number | boolean }) {
  if (typeof value === 'string') {
    return <span className="text-semantic-success">{`"${value}"`}</span>
  }
  if (typeof value === 'number') {
    return <span className="text-blue-600">{String(value)}</span>
  }
  // boolean
  return <span className="text-amber-600">{String(value)}</span>
}
