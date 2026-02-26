import type { Message, RequestParams } from '@/types/provider'
import type { OpenAIRequest, OpenAIStreamChunk } from '@/types/openai'

export function buildOpenAIRequest(
  config: { baseUrl: string; apiKey: string; model: string },
  messages: Message[],
  params: RequestParams,
): { url: string; headers: Record<string, string>; body: OpenAIRequest } {
  const url = `${config.baseUrl}/v1/chat/completions`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  }

  const body: OpenAIRequest = {
    model: config.model,
    messages: messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant' | 'tool',
      content: m.content,
    })),
    stream: params.stream,
  }

  if (params.temperature !== undefined) {
    body.temperature = params.temperature
  }
  if (params.topP !== undefined) {
    body.top_p = params.topP
  }
  if (params.maxTokens !== undefined) {
    body.max_tokens = params.maxTokens
  }
  if (params.frequencyPenalty !== undefined) {
    body.frequency_penalty = params.frequencyPenalty
  }
  if (params.presencePenalty !== undefined) {
    body.presence_penalty = params.presencePenalty
  }
  if (params.stop !== undefined && params.stop.length > 0) {
    body.stop = params.stop
  }

  if (params.stream) {
    body.stream_options = { include_usage: true }
  }

  return { url, headers, body }
}

export function parseOpenAIStreamLine(line: string): {
  done: boolean
  deltaContent?: string
  parsed?: OpenAIStreamChunk
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
} {
  // Empty lines and comments are no-ops
  if (!line || line.startsWith(':')) {
    return { done: false }
  }

  // SSE data lines
  if (line.startsWith('data: ')) {
    const data = line.slice(6).trim()

    if (data === '[DONE]') {
      return { done: true }
    }

    try {
      const parsed = JSON.parse(data) as OpenAIStreamChunk

      const deltaContent = parsed.choices?.[0]?.delta?.content ?? undefined

      const usage = parsed.usage ?? undefined

      return { done: false, deltaContent, parsed, usage }
    } catch {
      // Malformed JSON — skip
      return { done: false }
    }
  }

  return { done: false }
}
