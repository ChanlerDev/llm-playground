import { useState, useCallback, useEffect } from 'react'
import { Terminal, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { useCanvasStore } from '@/hooks/useCanvasStore'
import { useApiRequest } from '@/hooks/useApiRequest'
import { Canvas, ProviderFloat } from '@/components/canvas'
import { ResponsePanel } from '@/components/ResponsePanel'
import { StatsDashboard } from '@/components/StatsDashboard'
import { Button } from '@/components/ui/button'

function App() {
  const canvas = useCanvasStore()
  const api = useApiRequest()

  const [responseOpen, setResponseOpen] = useState(true)
  const [responseWidth, setResponseWidth] = useState(360)

  const isStreamMode = api.params.stream
  const isActivelyStreaming = api.params.stream && api.isLoading

  // Send request using active block's messages
  const handleSend = useCallback(() => {
    if (!canvas.activeBlock) return
    api.sendRequest(canvas.activeBlock.messages, canvas.activeBlock.systemPrompt)
  }, [canvas.activeBlock, api])

  // Add response to active block
  const handleAddToMessages = useCallback(() => {
    if (!canvas.activeBlock) return
    const responseMessages = api.getResponseMessages()
    if (responseMessages.length > 0) {
      canvas.setBlockMessages(canvas.activeBlock.id, [
        ...canvas.activeBlock.messages,
        ...responseMessages,
      ])
    }
  }, [canvas, api])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!api.isLoading && api.config.apiKey && canvas.activeBlock) {
          handleSend()
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        api.abort()
      }
    },
    [api, canvas.activeBlock, handleSend],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Resize handle for response panel
  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = responseWidth

      const onMove = (ev: PointerEvent) => {
        const dx = startX - ev.clientX
        setResponseWidth(Math.max(260, Math.min(600, startWidth + dx)))
      }
      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [responseWidth],
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-ink">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-canvas px-4">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-muted" />
          <h1 className="text-body-sm font-semibold">LLM Canvas</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatsDashboard stats={api.stats} isLoading={api.isLoading} />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setResponseOpen(!responseOpen)}
            title={responseOpen ? 'Close response panel' : 'Open response panel'}
          >
            {responseOpen ? (
              <PanelRightClose className="size-4 text-muted" />
            ) : (
              <PanelRightOpen className="size-4 text-muted" />
            )}
          </Button>
        </div>
      </header>

      {/* Main area */}
      <main className="flex min-h-0 flex-1">
        {/* Canvas */}
        <div className="relative min-h-0 flex-1">
          {/* Provider float */}
          <ProviderFloat
            config={api.config}
            setConfig={api.setConfig}
            setProvider={api.setProvider}
            params={api.params}
            setParams={api.setParams}
            isLoading={api.isLoading}
            activeBlockTitle={canvas.activeBlock?.title ?? null}
            onSend={handleSend}
            onAbort={api.abort}
          />

          {/* Canvas */}
          <Canvas
            viewport={canvas.viewport}
            blocks={canvas.blocks}
            connections={canvas.connections}
            activeBlockId={canvas.activeBlock?.id ?? null}
            onViewportChange={canvas.setViewport}
            onBlockMove={canvas.moveBlock}
            onBlockSelect={canvas.setActiveBlock}
            onBlockUpdate={canvas.updateBlock}
            onBlockDelete={canvas.deleteBlock}
            onBlockDuplicate={canvas.duplicateBlock}
            onBlockMessagesChange={canvas.setBlockMessages}
            onBlockSystemPromptChange={canvas.setBlockSystemPrompt}
            onAddBlock={canvas.addBlock}
            onAddConnection={canvas.addConnection}
            onDeleteConnection={canvas.deleteConnection}
            onUpdateConnection={canvas.updateConnection}
          />
        </div>

        {/* Response panel */}
        {responseOpen && (
          <>
            {/* Resize handle */}
            <div
              className="w-1 cursor-col-resize bg-hairline hover:bg-primary/30 active:bg-primary/50"
              onPointerDown={handleResizeStart}
            />

            <div
              className="min-h-0 shrink-0 overflow-hidden border-l border-hairline"
              style={{ width: responseWidth }}
            >
              <ResponsePanel
                isLoading={api.isLoading}
                error={api.error}
                responseBody={api.responseBody}
                assembledContent={api.assembledContent}
                chunks={api.chunks}
                isStreamMode={isStreamMode}
                isActivelyStreaming={isActivelyStreaming}
                onAddToMessages={handleAddToMessages}
                onClear={api.clearResponse}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
