import type { Message, RequestParams } from '@/types/provider'
import type { AnthropicRequest } from '@/types/anthropic'

export function buildAnthropicRequest(
  config: { baseUrl: string; apiKey: string; model: string },
  messages: Message[],
  params: RequestParams,
): { url: string; headers: Record<string, string>; body: AnthropicRequest } {
  const url = `${config.baseUrl}/v1/messages`

  const headers: Record<string, string> = {
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  }

  // Extract system message from messages array into top-level system field
  let systemMessage: string | undefined
  const filteredMessages = messages.filter((m) => {
    if (m.role === 'system') {
      systemMessage = m.content
      return false
    }
    return true
  })

  const body: AnthropicRequest = {
    model: config.model,
    max_tokens: params.maxTokens ?? 1024,
    messages: filteredMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    stream: params.stream,
  }

  if (systemMessage) {
    body.system = systemMessage
  }
  if (params.temperature !== undefined) {
    body.temperature = params.temperature
  }
  if (params.topP !== undefined) {
    body.top_p = params.topP
  }
  if (params.topK !== undefined) {
    body.top_k = params.topK
  }
  if (params.stop !== undefined && params.stop.length > 0) {
    body.stop_sequences = params.stop
  }

  return { url, headers, body }
}

export function parseAnthropicStreamEvent(
  eventType: string,
  data: string,
): {
  done: boolean
  deltaContent?: string
  parsed?: unknown
  usage?: { input_tokens: number; output_tokens: number }
} {
  if (eventType === 'message_stop') {
    return { done: true }
  }

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>

    if (eventType === 'content_block_delta') {
      const delta = parsed.delta as { type?: string; text?: string } | undefined
      if (delta?.type === 'text_delta') {
        return { done: false, deltaContent: delta.text, parsed }
      }
      return { done: false, parsed }
    }

    if (eventType === 'message_start') {
      const message = parsed.message as { usage?: { input_tokens: number; output_tokens: number } } | undefined
      if (message?.usage) {
        return { done: false, parsed, usage: message.usage }
      }
      return { done: false, parsed }
    }

    if (eventType === 'message_delta') {
      const usage = parsed.usage as { input_tokens?: number; output_tokens: number } | undefined
      if (usage) {
        return {
          done: false,
          parsed,
          usage: {
            input_tokens: usage.input_tokens ?? 0,
            output_tokens: usage.output_tokens,
          },
        }
      }
      return { done: false, parsed }
    }

    return { done: false, parsed }
  } catch {
    return { done: false }
  }
}
