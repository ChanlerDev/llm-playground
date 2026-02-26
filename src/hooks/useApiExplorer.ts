import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  ProviderType,
  ProviderConfig,
  Message,
  RequestParams,
  SSEChunk,
  RequestStats,
} from '@/types/provider'
import type { OpenAIResponse } from '@/types/openai'
import type { AnthropicResponse } from '@/types/anthropic'
import { buildOpenAIRequest } from '@/services/openai-provider'
import { buildAnthropicRequest } from '@/services/anthropic-provider'
import { parseStream } from '@/services/stream-parser'

const PROVIDER_DEFAULTS: Record<ProviderType, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com', model: 'gpt-4o' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
}

const STORAGE_KEY = 'llm-api-explorer-config'

function loadSavedConfig(): ProviderConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ProviderConfig>
    // Validate the shape
    if (
      parsed.provider &&
      (parsed.provider === 'openai' || parsed.provider === 'anthropic') &&
      typeof parsed.baseUrl === 'string' &&
      typeof parsed.apiKey === 'string' &&
      typeof parsed.model === 'string'
    ) {
      return parsed as ProviderConfig
    }
    return null
  } catch {
    return null
  }
}

function saveConfig(config: ProviderConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage may be unavailable; silently ignore
  }
}

function createInitialStats(): RequestStats {
  return {
    startTime: 0,
    ttfb: null,
    endTime: null,
    totalDuration: null,
    chunkCount: 0,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    tokensPerSecond: null,
  }
}

export function useApiExplorer() {
  const [config, setConfig] = useState<ProviderConfig>(() => {
    return loadSavedConfig() ?? {
      provider: 'openai',
      baseUrl: PROVIDER_DEFAULTS.openai.baseUrl,
      apiKey: '',
      model: PROVIDER_DEFAULTS.openai.model,
    }
  })

  // Persist config to localStorage whenever it changes
  useEffect(() => {
    saveConfig(config)
  }, [config])

  const [messages, setMessages] = useState<Message[]>([
    { role: 'user', content: 'Hello!' },
  ])

  const [params, setParams] = useState<RequestParams>({
    temperature: 1,
    maxTokens: 1024,
    topP: 1,
    stream: true,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [responseBody, setResponseBody] = useState<unknown>(null)
  const [assembledContent, setAssembledContent] = useState('')
  const [chunks, setChunks] = useState<SSEChunk[]>([])
  const [stats, setStats] = useState<RequestStats>(createInitialStats)

  const abortControllerRef = useRef<AbortController | null>(null)

  const buildRequest = useCallback(() => {
    if (config.provider === 'openai') {
      return buildOpenAIRequest(config, messages, params)
    }
    return buildAnthropicRequest(config, messages, params)
  }, [config, messages, params])

  const sendRequest = useCallback(async () => {
    // Reset response state
    setIsLoading(true)
    setError(null)
    setResponseBody(null)
    setAssembledContent('')
    setChunks([])

    const startTime = performance.now()
    setStats({ ...createInitialStats(), startTime })

    // Create a new AbortController for this request
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const { url, headers, body } = buildRequest()

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorMessage: string
        try {
          const errorBody = await response.json() as Record<string, unknown>
          errorMessage =
            (errorBody.error as { message?: string })?.message ??
            JSON.stringify(errorBody)
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        setError(errorMessage)
        setIsLoading(false)
        return
      }

      if (!params.stream) {
        // Non-streaming response
        const data = (await response.json()) as unknown
        setResponseBody(data)

        // Extract content based on provider
        let content = ''
        if (config.provider === 'openai') {
          const openaiResponse = data as OpenAIResponse
          content = openaiResponse.choices?.[0]?.message?.content ?? ''
        } else {
          const anthropicResponse = data as AnthropicResponse
          const textBlock = anthropicResponse.content?.find(
            (block) => block.type === 'text',
          )
          content = textBlock?.text ?? ''
        }
        setAssembledContent(content)

        // Update stats for non-streaming
        const endTime = performance.now()
        const totalDuration = endTime - startTime
        const ttfb = endTime - startTime

        let promptTokens: number | null = null
        let completionTokens: number | null = null
        let totalTokens: number | null = null

        if (config.provider === 'openai') {
          const usage = (data as OpenAIResponse).usage
          if (usage) {
            promptTokens = usage.prompt_tokens
            completionTokens = usage.completion_tokens
            totalTokens = usage.total_tokens
          }
        } else {
          const usage = (data as AnthropicResponse).usage
          if (usage) {
            promptTokens = usage.input_tokens
            completionTokens = usage.output_tokens
            totalTokens = usage.input_tokens + usage.output_tokens
          }
        }

        const tokensPerSecond =
          completionTokens != null && totalDuration > 0
            ? (completionTokens / totalDuration) * 1000
            : null

        setStats({
          startTime,
          ttfb,
          endTime,
          totalDuration,
          chunkCount: 0,
          promptTokens,
          completionTokens,
          totalTokens,
          tokensPerSecond,
        })

        setIsLoading(false)
      } else {
        // Streaming response
        await parseStream(response, config.provider, {
          onChunk: (chunk) => {
            setChunks((prev) => [...prev, chunk])
          },
          onStats: (partialStats) => {
            setStats((prev) => ({ ...prev, ...partialStats }))
          },
          onContent: (delta) => {
            setAssembledContent((prev) => prev + delta)
          },
          onDone: () => {
            setIsLoading(false)
          },
          onError: (err) => {
            setError(err.message)
            setIsLoading(false)
          },
        })
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Request was aborted — not an error
        setIsLoading(false)
        return
      }
      setError(err instanceof Error ? err.message : String(err))
      setIsLoading(false)
    }
  }, [buildRequest, config.provider, params.stream])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsLoading(false)
  }, [])

  const setProvider = useCallback((provider: ProviderType) => {
    const defaults = PROVIDER_DEFAULTS[provider]
    setConfig((prev) => ({
      ...prev,
      provider,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
    }))
  }, [])

  return {
    // State
    config,
    messages,
    params,
    isLoading,
    error,
    responseBody,
    assembledContent,
    chunks,
    stats,

    // Actions
    setConfig,
    setMessages,
    setParams,
    setProvider,
    buildRequest,
    sendRequest,
    abort,
  }
}
