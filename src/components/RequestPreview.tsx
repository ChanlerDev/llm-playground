import { useState, useMemo, useCallback } from 'react'
import { Check, Terminal } from 'lucide-react'
import type { ProviderType } from '@/types/provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JsonViewer } from '@/components/JsonViewer'

interface RequestPreviewProps {
  buildRequest: () => { url: string; headers: Record<string, string>; body: unknown }
  provider: ProviderType
}

function maskValue(value: string): string {
  if (value.length <= 4) return value
  return value.slice(0, 4) + '\u2022\u2022\u2022\u2022\u2022'
}

function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()
    if (lowerKey === 'authorization' || lowerKey === 'x-api-key') {
      masked[key] = maskValue(value)
    } else {
      masked[key] = value
    }
  }
  return masked
}

function buildCurlCommand(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): string {
  const parts = [`curl -X POST '${url}'`]
  for (const [key, value] of Object.entries(headers)) {
    parts.push(`  -H '${key}: ${value}'`)
  }
  parts.push(`  -d '${JSON.stringify(body, null, 2)}'`)
  return parts.join(' \\\n')
}

export function RequestPreview({ buildRequest, provider }: RequestPreviewProps) {
  const [curlCopied, setCurlCopied] = useState(false)

  const request = useMemo(() => {
    try {
      return buildRequest()
    } catch {
      return null
    }
  }, [buildRequest])

  const handleCopyCurl = useCallback(async () => {
    if (!request) return
    const curl = buildCurlCommand(request.url, request.headers, request.body)
    await navigator.clipboard.writeText(curl)
    setCurlCopied(true)
    setTimeout(() => setCurlCopied(false), 2000)
  }, [request])

  if (!request) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
        Unable to build request preview.
      </div>
    )
  }

  const maskedHeaders = maskHeaders(request.headers)

  return (
    <div className="space-y-4">
      {/* URL Line */}
      <div className="flex items-center gap-2">
        <Badge className="shrink-0 bg-green-600 text-white hover:bg-green-600">POST</Badge>
        <code className="truncate text-sm text-zinc-300">{request.url}</code>
        <Badge variant="outline" className="ml-auto shrink-0 text-[10px] text-zinc-400">
          {provider}
        </Badge>
      </div>

      {/* Headers */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Headers</h4>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs">
          {Object.entries(maskedHeaders).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-zinc-400">{key}:</span>
              <span className="text-zinc-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Body</h4>
        <JsonViewer data={request.body} defaultExpanded={3} />
      </div>

      {/* Copy as cURL */}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-zinc-700 text-zinc-400 hover:text-zinc-200"
        onClick={handleCopyCurl}
      >
        {curlCopied ? (
          <>
            <Check className="size-3.5" />
            Copied!
          </>
        ) : (
          <>
            <Terminal className="size-3.5" />
            Copy as cURL
          </>
        )}
      </Button>
    </div>
  )
}
