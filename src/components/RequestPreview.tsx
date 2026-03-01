import { useState, useMemo, useCallback, useEffect } from 'react'
import { Check, Terminal, Pencil, RotateCcw } from 'lucide-react'
import type { ProviderType } from '@/types/provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { JsonViewer } from '@/components/JsonViewer'

interface RequestPreviewProps {
  buildRequest: () => { url: string; headers: Record<string, string>; body: unknown }
  provider: ProviderType
  bodyOverride: string | null
  setBodyOverride: (value: string | null) => void
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

export function RequestPreview({
  buildRequest,
  provider,
  bodyOverride,
  setBodyOverride,
}: RequestPreviewProps) {
  const [curlCopied, setCurlCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const request = useMemo(() => {
    try {
      return buildRequest()
    } catch {
      return null
    }
  }, [buildRequest])

  // When entering edit mode, initialize with current body (or override)
  const enterEditMode = useCallback(() => {
    if (bodyOverride !== null) {
      setEditValue(bodyOverride)
    } else if (request) {
      setEditValue(JSON.stringify(request.body, null, 2))
    }
    setJsonError(null)
    setIsEditing(true)
  }, [request, bodyOverride])

  // Validate and apply edits
  const applyEdit = useCallback(() => {
    try {
      JSON.parse(editValue)
      setBodyOverride(editValue)
      setJsonError(null)
      setIsEditing(false)
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }, [editValue, setBodyOverride])

  // Reset to auto-generated body
  const resetBody = useCallback(() => {
    setBodyOverride(null)
    setIsEditing(false)
    setJsonError(null)
  }, [setBodyOverride])

  // Sync editValue when bodyOverride changes externally
  useEffect(() => {
    if (bodyOverride !== null && isEditing) {
      setEditValue(bodyOverride)
    }
  }, [bodyOverride, isEditing])

  const handleCopyCurl = useCallback(async () => {
    if (!request) return
    const body = bodyOverride !== null ? JSON.parse(bodyOverride) : request.body
    const curl = buildCurlCommand(request.url, request.headers, body)
    await navigator.clipboard.writeText(curl)
    setCurlCopied(true)
    setTimeout(() => setCurlCopied(false), 2000)
  }, [request, bodyOverride])

  if (!request) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
        Unable to build request preview.
      </div>
    )
  }

  const maskedHeaders = maskHeaders(request.headers)
  const displayBody = bodyOverride !== null ? JSON.parse(bodyOverride) : request.body

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
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Body</h4>
          <div className="flex gap-1">
            {bodyOverride !== null && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-amber-400 hover:text-amber-300"
                onClick={resetBody}
                title="Reset to auto-generated body"
              >
                <RotateCcw className="mr-1 size-3" />
                Reset
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-zinc-400 hover:text-zinc-200"
              onClick={isEditing ? applyEdit : enterEditMode}
            >
              {isEditing ? (
                <>
                  <Check className="mr-1 size-3" />
                  Apply
                </>
              ) : (
                <>
                  <Pencil className="mr-1 size-3" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </div>

        {bodyOverride !== null && !isEditing && (
          <div className="rounded bg-amber-950/30 px-2 py-1 text-[10px] text-amber-400">
            Custom body active — form changes won't apply until you Reset
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value)
                setJsonError(null)
              }}
              className="min-h-[300px] border-zinc-700 bg-zinc-950 font-mono text-xs text-zinc-200"
              spellCheck={false}
            />
            {jsonError && (
              <div className="rounded bg-red-950/50 px-2 py-1 text-xs text-red-400">
                {jsonError}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={applyEdit}
              >
                <Check className="size-3" />
                Apply Changes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-400"
                onClick={() => {
                  setIsEditing(false)
                  setJsonError(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <JsonViewer data={displayBody} defaultExpanded={3} />
        )}
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
