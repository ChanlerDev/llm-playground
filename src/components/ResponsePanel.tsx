import { AlertCircle, Loader2, FileText, Radio, Code2 } from 'lucide-react'
import type { SSEChunk } from '@/types/provider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { JsonViewer } from '@/components/JsonViewer'
import { StreamViewer } from '@/components/StreamViewer'
import { cn } from '@/lib/utils'

interface ResponsePanelProps {
  isLoading: boolean
  error: string | null
  responseBody: unknown
  assembledContent: string
  chunks: SSEChunk[]
  isStreaming: boolean
}

function ErrorBanner({ error }: { error: string }) {
  return (
    <div className="mx-4 mt-4 rounded-lg border border-red-900/50 bg-red-950/30 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-400">Request Error</p>
          <p className="mt-1 break-all font-mono text-xs text-red-300/80">{error}</p>
        </div>
      </div>
    </div>
  )
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Loader2 className="size-3.5 animate-spin text-zinc-400" />
      <span className="text-xs text-zinc-500">Loading...</span>
    </div>
  )
}

function ResponseTab({
  isStreaming,
  isLoading,
  responseBody,
  chunks,
}: {
  isStreaming: boolean
  isLoading: boolean
  responseBody: unknown
  chunks: SSEChunk[]
}) {
  if (isStreaming) {
    return <StreamViewer chunks={chunks} isStreaming={isLoading} />
  }

  if (responseBody != null) {
    return (
      <div className="p-4">
        <JsonViewer data={responseBody} defaultExpanded={2} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-zinc-500">
      <FileText className="size-5 text-zinc-600" />
      <p className="text-sm">Response will appear here after sending a request</p>
    </div>
  )
}

function ContentTab({
  assembledContent,
  isLoading,
  isStreaming,
}: {
  assembledContent: string
  isLoading: boolean
  isStreaming: boolean
}) {
  if (!assembledContent && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-zinc-500">
        <Code2 className="size-5 text-zinc-600" />
        <p className="text-sm">Assembled content will appear here</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <pre className="p-4 font-mono text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">
        <code>
          {assembledContent}
          {isLoading && isStreaming && (
            <span className="inline-block h-4 w-1.5 animate-pulse bg-zinc-400 align-middle" />
          )}
        </code>
      </pre>
    </ScrollArea>
  )
}

function RawSSETab({ chunks }: { chunks: SSEChunk[] }) {
  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-zinc-500">
        <Radio className="size-5 text-zinc-600" />
        <p className="text-sm">Raw SSE data will appear here</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {chunks.map((chunk, i) => (
          <div key={chunk.id} className="flex font-mono text-xs leading-5">
            <span className="mr-3 w-8 shrink-0 select-none text-right text-zinc-600">
              {i + 1}
            </span>
            <span className={cn(
              'min-w-0 break-all',
              chunk.deltaContent ? 'text-zinc-300' : 'text-zinc-500',
            )}>
              {chunk.raw}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

export function ResponsePanel({
  isLoading,
  error,
  responseBody,
  assembledContent,
  chunks,
  isStreaming,
}: ResponsePanelProps) {
  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Error banner */}
      {error && <ErrorBanner error={error} />}

      {/* Loading indicator */}
      {isLoading && <LoadingIndicator />}

      {/* Tabs */}
      <Tabs defaultValue="response" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-zinc-800 px-4">
          <TabsList variant="line" className="h-9">
            <TabsTrigger value="response" className="text-xs">
              Response
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs">
              Content
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-xs">
              Raw SSE
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="response" className="min-h-0 flex-1 overflow-auto">
          <ResponseTab
            isStreaming={isStreaming}
            isLoading={isLoading}
            responseBody={responseBody}
            chunks={chunks}
          />
        </TabsContent>

        <TabsContent value="content" className="min-h-0 flex-1 overflow-auto">
          <ContentTab
            assembledContent={assembledContent}
            isLoading={isLoading}
            isStreaming={isStreaming}
          />
        </TabsContent>

        <TabsContent value="raw" className="min-h-0 flex-1 overflow-auto">
          <RawSSETab chunks={chunks} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
