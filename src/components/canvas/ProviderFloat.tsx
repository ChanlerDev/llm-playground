import { useState } from 'react'
import { Settings, Send, Square, X } from 'lucide-react'
import type { ProviderType, ProviderConfig } from '@/types/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ProviderFloatProps {
  config: ProviderConfig
  setConfig: (config: ProviderConfig) => void
  setProvider: (provider: ProviderType) => void
  isLoading: boolean
  activeBlockTitle: string | null
  onSend: () => void
  onAbort: () => void
}

export function ProviderFloat({
  config,
  setConfig,
  setProvider,
  isLoading,
  activeBlockTitle,
  onSend,
  onAbort,
}: ProviderFloatProps) {
  const [isOpen, setIsOpen] = useState(false)

  function updateConfig(patch: Partial<ProviderConfig>) {
    setConfig({ ...config, ...patch })
  }

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
      {/* Send button row */}
      <div className="flex items-center gap-2">
        {isLoading ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-semantic-error text-semantic-error"
            onClick={onAbort}
          >
            <Square className="size-3" />
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={onSend}
            disabled={!config.apiKey}
          >
            <Send className="size-3" />
            Send
            {activeBlockTitle && (
              <span className="ml-1 max-w-[100px] truncate text-[10px] opacity-80">
                ({activeBlockTitle})
              </span>
            )}
          </Button>
        )}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setIsOpen(!isOpen)}
          className={isOpen ? 'border-primary text-primary' : ''}
        >
          <Settings className="size-3.5" />
        </Button>
      </div>

      {/* Config panel */}
      {isOpen && (
        <div className="w-[260px] rounded-lg border border-hairline bg-surface-card">
          <div className="flex items-center justify-between border-b border-hairline-soft px-3 py-2">
            <span className="text-caption-upper">Provider</span>
            <button
              className="rounded p-0.5 text-muted hover:text-ink"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-3.5" />
            </button>
          </div>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-3">
              {/* Provider Toggle */}
              <Tabs
                value={config.provider}
                onValueChange={(v) => setProvider(v as ProviderType)}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="openai" className="flex-1 text-[12px]">
                    OpenAI
                  </TabsTrigger>
                  <TabsTrigger value="anthropic" className="flex-1 text-[12px]">
                    Anthropic
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted">Base URL</Label>
                  <Input
                    value={config.baseUrl}
                    onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                    placeholder="https://api.openai.com"
                    className="h-7 text-[12px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted">API Key</Label>
                  <Input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => updateConfig({ apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="h-7 text-[12px]"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
