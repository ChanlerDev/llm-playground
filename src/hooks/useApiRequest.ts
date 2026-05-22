import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  ProviderType,
  ProviderConfig,
  Message,
  MessageToolCall,
  RequestParams,
  ToolDefinition,
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
const STORAGE_KEY_TOOLS = 'llm-api-explorer-tools'
const STORAGE_KEY_PARAMS = 'llm-api-explorer-params'

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // silently ignore
  }
}

function loadSavedConfig(): ProviderConfig | null {
  const parsed = loadJson<Partial<ProviderConfig>>(STORAGE_KEY)
  if (
    parsed &&
    parsed.provider &&
    (parsed.provider === 'openai' || parsed.provider === 'anthropic') &&
    typeof parsed.baseUrl === 'string' &&
    typeof parsed.apiKey === 'string' &&
    typeof parsed.model === 'string'
  ) {
    return parsed as ProviderConfig
  }
  return null
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

/**
 * useApiRequest — handles provider config, API execution, response state.
 * Messages are passed in from the active canvas block (not owned by this hook).
 */
export function useApiRequest() {
  const [config, setConfig] = useState<ProviderConfig>(() => {
    return loadSavedConfig() ?? {
      provider: 'openai',
      baseUrl: PROVIDER_DEFAULTS.openai.baseUrl,
      apiKey: '',
      model: PROVIDER_DEFAULTS.openai.model,
    }
  })

  useEffect(() => {
    saveJson(STORAGE_KEY, config)
  }, [config])

  const [tools, setTools] = useState<ToolDefinition[]>(() => {
    return loadJson<ToolDefinition[]>(STORAGE_KEY_TOOLS) ?? []
  })

  useEffect(() => {
    saveJson(STORAGE_KEY_TOOLS, tools)
  }, [tools])

  const DEFAULT_PARAMS: RequestParams = {
    temperature: 1,
    maxTokens: 1024,
    topP: 1,
    stream: true,
  }

  const [params, setParams] = useState<RequestParams>(() => {
    return loadJson<RequestParams>(STORAGE_KEY_PARAMS) ?? DEFAULT_PARAMS
  })

  useEffect(() => {
    saveJson(STORAGE_KEY_PARAMS, params)
  }, [params])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [responseBody, setResponseBody] = useState<unknown>(null)
  const [assembledContent, setAssembledContent] = useState('')
  const [chunks, setChunks] = useState<SSEChunk[]>([])
  const [stats, setStats] = useState<RequestStats>(createInitialStats)

  const lastResponseRef = useRef<unknown>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamingToolCallsRef = useRef<MessageToolCall[]>([])
  const streamingAnthropicToolUseRef = useRef<{ id: string; name: string; input: unknown }[]>([])

  const setProvider = useCallback((provider: ProviderType) => {
    const defaults = PROVIDER_DEFAULTS[provider]
    setConfig((prev) => ({
      ...prev,
      provider,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
    }))
  }, [])

  const buildRequest = useCallback(
    (messages: Message[], systemPrompt: string) => {
      const enabledTools = tools.filter((t) => t.enabled)
      const toolsArg = enabledTools.length > 0 ? enabledTools : undefined
      const allMessages = systemPrompt.trim()
        ? [{ role: 'system', content: systemPrompt.trim() }, ...messages]
        : messages
      if (config.provider === 'openai') {
        return buildOpenAIRequest(config, allMessages, params, toolsArg)
      }
      return buildAnthropicRequest(config, allMessages, params, toolsArg)
    },
    [config, params, tools],
  )

  const sendRequest = useCallback(
    async (messages: Message[], systemPrompt: string) => {
      setIsLoading(true)
      setError(null)
      setResponseBody(null)
      setAssembledContent('')
      setChunks([])
      lastResponseRef.current = null
      streamingToolCallsRef.current = []
      streamingAnthropicToolUseRef.current = []

      const startTime = performance.now()
      setStats({ ...createInitialStats(), startTime })

      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const { url, headers, body } = buildRequest(messages, systemPrompt)

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok) {
          let errorMessage: string
          try {
            const errorBody = (await response.json()) as Record<string, unknown>
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
          const data = (await response.json()) as unknown
          setResponseBody(data)
          lastResponseRef.current = data

          let content = ''
          if (config.provider === 'openai') {
            const openaiResponse = data as OpenAIResponse
            const message = openaiResponse.choices?.[0]?.message
            if (message?.content) content = message.content
            if (message?.tool_calls?.length) {
              const toolCallsText = message.tool_calls
                .map((tc) => {
                  let args = tc.function.arguments
                  try {
                    args = JSON.stringify(JSON.parse(args), null, 2)
                  } catch {
                    /* keep raw */
                  }
                  return `Tool Call: ${tc.function.name}\n${args}`
                })
                .join('\n\n')
              content = content ? `${content}\n\n${toolCallsText}` : toolCallsText
            }
          } else {
            const anthropicResponse = data as AnthropicResponse
            const parts: string[] = []
            for (const block of anthropicResponse.content ?? []) {
              if (block.type === 'text' && block.text) {
                parts.push(block.text)
              } else if (block.type === 'tool_use') {
                const args = JSON.stringify(block.input, null, 2)
                parts.push(`Tool Call: ${block.name}\n${args}`)
              }
            }
            content = parts.join('\n\n')
          }
          setAssembledContent(content)

          const endTime = performance.now()
          const totalDuration = endTime - startTime

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
            ttfb: totalDuration,
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
          await parseStream(response, config.provider, {
            onChunk: (chunk) => setChunks((prev) => [...prev, chunk]),
            onStats: (partialStats) => setStats((prev) => ({ ...prev, ...partialStats })),
            onContent: (delta) => setAssembledContent((prev) => prev + delta),
            onToolCall: (toolCall) => streamingToolCallsRef.current.push(toolCall),
            onAnthropicToolUse: (toolUse) =>
              streamingAnthropicToolUseRef.current.push(toolUse),
            onDone: () => setIsLoading(false),
            onError: (err) => {
              setError(err.message)
              setIsLoading(false)
            },
          })
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setIsLoading(false)
          return
        }
        setError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      }
    },
    [buildRequest, config.provider, params.stream],
  )

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsLoading(false)
  }, [])

  /**
   * Build response messages to add back to the active block.
   */
  const getResponseMessages = useCallback((): Message[] => {
    const data = lastResponseRef.current
    const newMessages: Message[] = []

    if (config.provider === 'openai' && data) {
      const resp = data as OpenAIResponse
      const msg = resp.choices?.[0]?.message
      if (msg) {
        const assistantMsg: Message = { role: 'assistant', content: msg.content ?? '' }
        if (msg.tool_calls?.length) {
          assistantMsg.tool_calls = msg.tool_calls.map(
            (tc): MessageToolCall => ({
              id: tc.id,
              function: { name: tc.function.name, arguments: tc.function.arguments },
            }),
          )
        }
        newMessages.push(assistantMsg)
        if (msg.tool_calls?.length) {
          for (const tc of msg.tool_calls) {
            newMessages.push({ role: 'tool', content: '', tool_call_id: tc.id })
          }
        }
      }
    } else if (config.provider === 'openai' && streamingToolCallsRef.current.length > 0) {
      const assistantMsg: Message = {
        role: 'assistant',
        content: '',
        tool_calls: streamingToolCallsRef.current,
      }
      newMessages.push(assistantMsg)
      for (const tc of streamingToolCallsRef.current) {
        newMessages.push({ role: 'tool', content: '', tool_call_id: tc.id })
      }
    } else if (config.provider === 'anthropic' && data) {
      const resp = data as AnthropicResponse
      const textParts: string[] = []
      const toolUseBlocks: { id: string; name: string; input: unknown }[] = []
      for (const block of resp.content ?? []) {
        if (block.type === 'text' && block.text) textParts.push(block.text)
        else if (block.type === 'tool_use')
          toolUseBlocks.push({ id: block.id, name: block.name, input: block.input })
      }
      const assistantMsg: Message = { role: 'assistant', content: textParts.join('\n\n') }
      if (toolUseBlocks.length) assistantMsg.anthropic_tool_use = toolUseBlocks
      newMessages.push(assistantMsg)
      for (const tu of toolUseBlocks) {
        newMessages.push({ role: 'tool', content: '', tool_call_id: tu.id })
      }
    } else if (
      config.provider === 'anthropic' &&
      streamingAnthropicToolUseRef.current.length > 0
    ) {
      const assistantMsg: Message = {
        role: 'assistant',
        content: '',
        anthropic_tool_use: streamingAnthropicToolUseRef.current,
      }
      newMessages.push(assistantMsg)
      for (const tu of streamingAnthropicToolUseRef.current) {
        newMessages.push({ role: 'tool', content: '', tool_call_id: tu.id })
      }
    }

    if (newMessages.length === 0 && assembledContent) {
      newMessages.push({ role: 'assistant', content: assembledContent })
    }

    return newMessages
  }, [config.provider, assembledContent])

  const clearResponse = useCallback(() => {
    setResponseBody(null)
    setAssembledContent('')
    setChunks([])
    setError(null)
    setStats(createInitialStats)
    lastResponseRef.current = null
    streamingToolCallsRef.current = []
    streamingAnthropicToolUseRef.current = []
  }, [])

  const resetConfig = useCallback(() => {
    const defaults = PROVIDER_DEFAULTS[config.provider]
    setConfig({
      provider: config.provider,
      baseUrl: defaults.baseUrl,
      apiKey: '',
      model: defaults.model,
    })
  }, [config.provider])

  return {
    config,
    setConfig,
    setProvider,
    params,
    setParams,
    tools,
    setTools,
    isLoading,
    error,
    responseBody,
    assembledContent,
    chunks,
    stats,
    sendRequest,
    abort,
    getResponseMessages,
    clearResponse,
    resetConfig,
  }
}
