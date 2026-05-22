import { Send, Square, RotateCcw } from 'lucide-react'
import type { ProviderType, ProviderConfig, RequestParams } from '@/types/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ConfigPanelProps {
  config: ProviderConfig
  setConfig: (config: ProviderConfig) => void
  setProvider: (provider: ProviderType) => void
  params: RequestParams
  setParams: (params: RequestParams) => void
  isLoading: boolean
  onSend: () => void
  onAbort: () => void
  onReset: () => void
}

export function ConfigPanel({
  config,
  setConfig,
  setProvider,
  params,
  setParams,
  isLoading,
  onSend,
  onAbort,
  onReset,
}: ConfigPanelProps) {
  const isOpenAI = config.provider === 'openai'
  const tempMax = isOpenAI ? 2 : 1

  function updateConfig(patch: Partial<ProviderConfig>) {
    setConfig({ ...config, ...patch })
  }

  function updateParams(patch: Partial<RequestParams>) {
    setParams({ ...params, ...patch })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-canvas-soft">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-4">
          {/* Provider Toggle */}
          <Tabs
            value={config.provider}
            onValueChange={(v) => setProvider(v as ProviderType)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="openai" className="flex-1">
                OpenAI
              </TabsTrigger>
              <TabsTrigger value="anthropic" className="flex-1">
                Anthropic
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Connection */}
          <section className="space-y-3">
            <h3 className="text-caption-upper">Connection</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-caption">Base URL</Label>
                <Input
                  value={config.baseUrl}
                  onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com"
                  className="h-9 rounded-md border-hairline bg-surface-card text-sm text-ink"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption">API Key</Label>
                <Input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => updateConfig({ apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="h-9 rounded-md border-hairline bg-surface-card text-sm text-ink"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption">Model</Label>
                <Input
                  value={config.model}
                  onChange={(e) => updateConfig({ model: e.target.value })}
                  placeholder={isOpenAI ? 'gpt-4o' : 'claude-sonnet-4-20250514'}
                  className="h-9 rounded-md border-hairline bg-surface-card text-sm text-ink"
                />
              </div>
            </div>
          </section>

          {/* Parameters */}
          <section className="space-y-3">
            <h3 className="text-caption-upper">Parameters</h3>
            <div className="space-y-4">
              {/* Stream */}
              <div className="flex items-center justify-between">
                <Label className="text-sm text-body">Stream</Label>
                <Switch
                  checked={params.stream}
                  onCheckedChange={(checked) => updateParams({ stream: checked })}
                />
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-body">Temperature</Label>
                  <span className="font-mono text-xs text-muted">
                    {params.temperature?.toFixed(2) ?? '1.00'}
                  </span>
                </div>
                <Slider
                  value={[params.temperature ?? 1]}
                  onValueChange={([v]) => updateParams({ temperature: v })}
                  min={0}
                  max={tempMax}
                  step={0.01}
                />
              </div>

              {/* Max Tokens */}
              <div className="space-y-1.5">
                <Label className="text-sm text-body">Max Tokens</Label>
                <Input
                  type="number"
                  value={params.maxTokens ?? ''}
                  onChange={(e) =>
                    updateParams({
                      maxTokens: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="1024"
                  className="h-9 rounded-md border-hairline bg-surface-card text-sm text-ink"
                />
              </div>

              {/* Top P */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-body">Top P</Label>
                  <span className="font-mono text-xs text-muted">
                    {params.topP?.toFixed(2) ?? '1.00'}
                  </span>
                </div>
                <Slider
                  value={[params.topP ?? 1]}
                  onValueChange={([v]) => updateParams({ topP: v })}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>

              {/* OpenAI-only */}
              {isOpenAI && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-body">Frequency Penalty</Label>
                      <span className="font-mono text-xs text-muted">
                        {(params.frequencyPenalty ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[params.frequencyPenalty ?? 0]}
                      onValueChange={([v]) => updateParams({ frequencyPenalty: v })}
                      min={-2}
                      max={2}
                      step={0.01}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-body">Presence Penalty</Label>
                      <span className="font-mono text-xs text-muted">
                        {(params.presencePenalty ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[params.presencePenalty ?? 0]}
                      onValueChange={([v]) => updateParams({ presencePenalty: v })}
                      min={-2}
                      max={2}
                      step={0.01}
                    />
                  </div>
                </>
              )}

              {/* Anthropic-only */}
              {!isOpenAI && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-body">Top K</Label>
                  <Input
                    type="number"
                    value={params.topK ?? ''}
                    onChange={(e) =>
                      updateParams({
                        topK: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="Not set"
                    className="h-9 rounded-md border-hairline bg-surface-card text-sm text-ink"
                  />
                </div>
              )}
            </div>
          </section>

          <div className="h-20" />
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="border-t border-hairline bg-canvas-soft p-4">
        <div className="flex gap-2">
          <Button
            className="flex-1 rounded-md bg-primary text-on-primary text-button hover:bg-primary-active active:scale-[0.97] transition-transform"
            disabled={!config.apiKey || isLoading}
            onClick={onSend}
          >
            <Send className="size-3.5" />
            Send Request
          </Button>
          {isLoading && (
            <Button
              className="rounded-md bg-semantic-error text-on-primary hover:bg-semantic-error/80"
              onClick={onAbort}
            >
              <Square className="size-3.5" />
            </Button>
          )}
          {!isLoading && (
            <Button
              variant="outline"
              size="icon"
              className="rounded-md border-hairline-strong text-muted hover:text-ink"
              onClick={onReset}
              title="Reset"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
