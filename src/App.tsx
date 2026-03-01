import { useState, useEffect, useCallback } from 'react'
import { Terminal, Trash2 } from 'lucide-react'
import { useApiExplorer } from '@/hooks/useApiExplorer'
import { ConfigPanel } from '@/components/ConfigPanel'
import { MessageEditor } from '@/components/MessageEditor'
import { ToolsEditor } from '@/components/ToolsEditor'
import { RequestPreview } from '@/components/RequestPreview'
import { SchemaTree } from '@/components/SchemaTree'
import { ResponsePanel } from '@/components/ResponsePanel'
import { StatsDashboard } from '@/components/StatsDashboard'
import { Timeline } from '@/components/Timeline'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

function App() {
  const {
    config,
    setConfig,
    setProvider,
    systemPrompt,
    setSystemPrompt,
    messages,
    setMessages,
    tools,
    setTools,
    params,
    setParams,
    buildRequest,
    sendRequest,
    abort,
    isLoading,
    error,
    responseBody,
    assembledContent,
    chunks,
    stats,
    bodyOverride,
    setBodyOverride,
    addResponseToMessages,
    clearMessages,
    clearResponse,
    resetConfig,
  } = useApiExplorer()

  const [_selectedChunkId, setSelectedChunkId] = useState<string | null>(null)

  // Track whether current/last request was streaming mode
  const isStreamMode = params.stream
  const isActivelyStreaming = params.stream && isLoading

  // Keyboard shortcuts: Ctrl/Cmd+Enter to send, Escape to abort
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isLoading && config.apiKey) {
          sendRequest()
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        abort()
      }
    },
    [isLoading, config.apiKey, sendRequest, abort],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="size-5 text-zinc-400" />
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">
            LLM API Explorer
          </h1>
        </div>
        <StatsDashboard stats={stats} isLoading={isLoading} />
      </header>

      {/* ── Main 3-column grid ── */}
      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr_1fr]">
        {/* Left column: ConfigPanel */}
        <div className="hidden overflow-hidden border-r border-zinc-800 lg:block">
          <ConfigPanel
            config={config}
            setConfig={setConfig}
            setProvider={setProvider}
            params={params}
            setParams={setParams}
            isLoading={isLoading}
            onSend={sendRequest}
            onAbort={abort}
            onReset={resetConfig}
          />
        </div>

        {/* Mobile config: show as a collapsible section on small screens */}
        <div className="border-b border-zinc-800 lg:hidden">
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-900">
              <Terminal className="size-4 text-zinc-500" />
              Configuration
              <span className="ml-auto text-xs text-zinc-500 group-open:hidden">tap to expand</span>
            </summary>
            <div className="max-h-[60vh] overflow-y-auto">
              <ConfigPanel
                config={config}
                setConfig={setConfig}
                setProvider={setProvider}
                params={params}
                setParams={setParams}
                isLoading={isLoading}
                onSend={sendRequest}
                onAbort={abort}
                onReset={resetConfig}
              />
            </div>
          </details>
        </div>

        {/* Center column: Messages + RequestPreview + SchemaTree */}
        <div className="flex min-h-0 flex-col border-r border-zinc-800">
          <Tabs defaultValue="messages" className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4">
              <TabsList variant="line" className="h-9">
                <TabsTrigger value="messages" className="text-xs">
                  Messages
                  <span className="ml-1.5 text-[10px] text-zinc-500">({messages.length})</span>
                </TabsTrigger>
                <TabsTrigger value="tools" className="text-xs">
                  Tools
                  {tools.length > 0 && (
                    <span className="ml-1.5 text-[10px] text-zinc-500">
                      ({tools.filter((t) => t.enabled).length}/{tools.length})
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  Preview
                </TabsTrigger>
                <TabsTrigger value="schema" className="text-xs">
                  Schema
                </TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-zinc-500 hover:text-red-400"
                onClick={clearMessages}
                title="Clear messages"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            <TabsContent value="messages" className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <MessageEditor
                    systemPrompt={systemPrompt}
                    setSystemPrompt={setSystemPrompt}
                    messages={messages}
                    setMessages={setMessages}
                    provider={config.provider}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="tools" className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <ToolsEditor
                    tools={tools}
                    setTools={setTools}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="preview" className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <RequestPreview
                    buildRequest={buildRequest}
                    provider={config.provider}
                    bodyOverride={bodyOverride}
                    setBodyOverride={setBodyOverride}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="schema" className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <SchemaTree provider={config.provider} />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: ResponsePanel */}
        <div className="min-h-0 overflow-hidden">
          <ResponsePanel
            isLoading={isLoading}
            error={error}
            responseBody={responseBody}
            assembledContent={assembledContent}
            chunks={chunks}
            isStreamMode={isStreamMode}
            isActivelyStreaming={isActivelyStreaming}
            onAddToMessages={addResponseToMessages}
            onClear={clearResponse}
          />
        </div>
      </main>

      {/* ── Bottom bar: Timeline ── */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/50 p-2">
        <Timeline
          chunks={chunks}
          totalDuration={stats.totalDuration}
          onChunkSelect={setSelectedChunkId}
        />
      </div>
    </div>
  )
}

export default App
