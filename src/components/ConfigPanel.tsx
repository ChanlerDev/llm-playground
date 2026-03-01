import { Send, Square, RotateCcw } from 'lucide-react'
import type { ProviderType, ProviderConfig, RequestParams } from '@/types/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
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

          {/* Connection Settings */}
          <Card className="border-zinc-800 bg-zinc-900 py-4">
            <CardHeader className="px-4 py-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Base URL</Label>
                <Input
                  value={config.baseUrl}
                  onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com"
                  className="h-8 border-zinc-700 bg-zinc-800/50 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">API Key</Label>
                <Input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => updateConfig({ apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="h-8 border-zinc-700 bg-zinc-800/50 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Model</Label>
                <Input
                  value={config.model}
                  onChange={(e) => updateConfig({ model: e.target.value })}
                  placeholder={isOpenAI ? 'gpt-4o' : 'claude-sonnet-4-20250514'}
                  className="h-8 border-zinc-700 bg-zinc-800/50 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card className="border-zinc-800 bg-zinc-900 py-4">
            <CardHeader className="px-4 py-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4">
              {/* Stream Toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-sm text-zinc-300">Stream</Label>
                <Switch
                  checked={params.stream}
                  onCheckedChange={(checked) => updateParams({ stream: checked })}
                />
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-zinc-300">Temperature</Label>
                  <span className="font-mono text-xs text-zinc-400">
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
                <Label className="text-sm text-zinc-300">Max Tokens</Label>
                <Input
                  type="number"
                  value={params.maxTokens ?? ''}
                  onChange={(e) =>
                    updateParams({
                      maxTokens: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="1024"
                  className="h-8 border-zinc-700 bg-zinc-800/50 text-sm"
                />
              </div>

              {/* Top P */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-zinc-300">Top P</Label>
                  <span className="font-mono text-xs text-zinc-400">
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

              {/* OpenAI-only Parameters */}
              {isOpenAI && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-zinc-300">Frequency Penalty</Label>
                      <span className="font-mono text-xs text-zinc-400">
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
                      <Label className="text-sm text-zinc-300">Presence Penalty</Label>
                      <span className="font-mono text-xs text-zinc-400">
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

              {/* Anthropic-only Parameters */}
              {!isOpenAI && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-zinc-300">Top K</Label>
                  <Input
                    type="number"
                    value={params.topK ?? ''}
                    onChange={(e) =>
                      updateParams({
                        topK: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="Not set"
                    className="h-8 border-zinc-700 bg-zinc-800/50 text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spacer so content doesn't hide behind the fixed action buttons */}
          <div className="h-20" />
        </div>
      </ScrollArea>

      {/* Action Buttons — fixed at bottom */}
      <div className="border-t border-zinc-800 bg-zinc-950 p-4">
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={!config.apiKey || isLoading}
            onClick={onSend}
          >
            <Send className="size-4" />
            Send Request
          </Button>
          {isLoading && (
            <Button variant="destructive" onClick={onAbort}>
              <Square className="size-4" />
              Abort
            </Button>
          )}
          {!isLoading && (
            <Button
              variant="outline"
              size="icon"
              className="border-zinc-700 text-zinc-500 hover:text-zinc-200"
              onClick={onReset}
              title="Reset config & params"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
