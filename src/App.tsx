import { useState, useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { Terminal, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { useCanvasStore } from '@/hooks/useCanvasStore'
import { useApiRequest } from '@/hooks/useApiRequest'
import { Canvas, ProviderFloat } from '@/components/canvas'
import { ResponsePanel } from '@/components/ResponsePanel'
import { StatsDashboard } from '@/components/StatsDashboard'
import { Button } from '@/components/ui/button'
import { resolveRequestOverridesForBlock } from '@/services/request-block'

function App() {
  const canvas = useCanvasStore()
  const api = useApiRequest()

  const [responseOpen, setResponseOpen] = useState(true)
  const [responseWidth, setResponseWidth] = useState(360)
  const [loadingBlockId, setLoadingBlockId] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)

  // Track which block is being sent so we can auto-append response
  const sendingBlockIdRef = useRef<string | null>(null)

  const isStreamMode = api.requestStreamMode
  const isActivelyStreaming = api.requestStreamMode && api.isLoading

  // Send request for a specific block
  const handleBlockSend = useCallback(
    (blockId: string) => {
      const block = canvas.blocks.find((b) => b.id === blockId)
      if (!block || block.kind !== 'messages' || !api.config.apiKey) return
      const resolved = resolveRequestOverridesForBlock(
        block,
        canvas.blocks,
        canvas.connections,
      )
      if (!resolved.ok) {
        setRequestError(resolved.error)
        return
      }
      setRequestError(null)
      canvas.setActiveBlock(blockId)
      sendingBlockIdRef.current = blockId
      setLoadingBlockId(blockId)
      api.sendRequest(block.messages, block.systemPrompt, resolved.overrides)
    },
    [canvas, api],
  )

  // Auto-append response when loading finishes
  const prevIsLoading = useRef(api.isLoading)
  useEffect(() => {
    // Detect transition: loading → not loading
    if (prevIsLoading.current && !api.isLoading && sendingBlockIdRef.current) {
      const blockId = sendingBlockIdRef.current
      const block = canvas.blocks.find((b) => b.id === blockId)
      if (block?.kind === 'messages' && !api.error) {
        const responseMessages = api.getResponseMessages()
        if (responseMessages.length > 0) {
          canvas.setBlockMessages(blockId, [...block.messages, ...responseMessages])
        }
      }
      sendingBlockIdRef.current = null
      setLoadingBlockId(null)
    }
    prevIsLoading.current = api.isLoading
  }, [api.isLoading, api.error, api, canvas])

  // Send from ProviderFloat (uses active block)
  const handleSend = useCallback(() => {
    if (!canvas.activeBlock) return
    handleBlockSend(canvas.activeBlock.id)
  }, [canvas.activeBlock, handleBlockSend])

  // Manual add to messages (from response panel)
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
          handleBlockSend(canvas.activeBlock.id)
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        api.abort()
        setRequestError(null)
        setLoadingBlockId(null)
        sendingBlockIdRef.current = null
      }
    },
    [api, canvas.activeBlock, handleBlockSend],
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
          <div className="hidden sm:block">
            <StatsDashboard stats={api.stats} isLoading={api.isLoading} />
          </div>
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
      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
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
            loadingBlockId={loadingBlockId}
            onViewportChange={canvas.setViewport}
            onBlockMove={canvas.moveBlock}
            onBlockSelect={canvas.setActiveBlock}
            onBlockUpdate={canvas.updateBlock}
            onBlockDelete={canvas.deleteBlock}
            onBlockDuplicate={canvas.duplicateBlock}
            onBlockMessagesChange={canvas.setBlockMessages}
            onBlockSystemPromptChange={canvas.setBlockSystemPrompt}
            onBlockSend={handleBlockSend}
            onAbort={api.abort}
            onAddBlock={canvas.addBlock}
            onAddJsonRequestBlock={canvas.addJsonRequestBlock}
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
              className="hidden w-1 cursor-col-resize bg-hairline hover:bg-primary/30 active:bg-primary/50 md:block"
              onPointerDown={handleResizeStart}
            />

            <div
              className="h-[42vh] min-h-0 w-full overflow-hidden border-t border-hairline md:h-auto md:w-[var(--response-width)] md:shrink-0 md:border-l md:border-t-0"
              style={{ '--response-width': `${responseWidth}px` } as CSSProperties}
            >
              <ResponsePanel
                isLoading={api.isLoading}
                error={requestError ?? api.error}
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
