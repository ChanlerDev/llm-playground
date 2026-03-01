import type { Message, RequestParams, ToolDefinition } from '@/types/provider'
import type { OpenAIRequest, OpenAIStreamChunk } from '@/types/openai'

function toolsToJsonSchema(tool: ToolDefinition): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const p of tool.parameters) {
    const prop: Record<string, unknown> = { type: p.type, description: p.description }
    if (p.enum?.length) prop.enum = p.enum
    properties[p.name] = prop
    if (p.required) required.push(p.name)
  }
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  }
}

export function buildOpenAIRequest(
  config: { baseUrl: string; apiKey: string; model: string },
  messages: Message[],
  params: RequestParams,
  tools?: ToolDefinition[],
): { url: string; headers: Record<string, string>; body: OpenAIRequest } {
  const url = `${config.baseUrl}/v1/chat/completions`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  }

  const body: OpenAIRequest = {
    model: config.model,
    messages: messages.map((m) => {
      const msg: Record<string, unknown> = {
        role: m.role as 'system' | 'user' | 'assistant' | 'tool',
        content: m.content || null,
      }
      // Assistant messages may carry tool_calls
      if (m.role === 'assistant' && m.tool_calls?.length) {
        msg.tool_calls = m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: tc.function,
        }))
      }
      // Tool messages must reference tool_call_id
      if (m.role === 'tool' && m.tool_call_id) {
        msg.tool_call_id = m.tool_call_id
      }
      return msg
    }),
    stream: params.stream,
  }

  if (params.temperature !== undefined) {
    body.temperature = params.temperature
  }
  if (params.topP !== undefined) {
    body.top_p = params.topP
  }
  if (params.maxTokens !== undefined) {
    body.max_completion_tokens = params.maxTokens
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

  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: toolsToJsonSchema(t),
      },
    }))
  }

  if (params.stream) {
    body.stream_options = { include_usage: true }
  }

  return { url, headers, body }
}

export function parseOpenAIStreamLine(line: string): {
  done: boolean
  deltaContent?: string
  deltaToolCalls?: string
  parsed?: OpenAIStreamChunk
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
} {
  // Empty lines and comments are no-ops
  if (!line || line.startsWith(':')) {
    return { done: false }
  }

  // SSE data lines — tolerate "data:" with or without space
  if (line.startsWith('data:')) {
    const data = line.startsWith('data: ') ? line.slice(6).trim() : line.slice(5).trim()

    if (data === '[DONE]') {
      return { done: true }
    }

    try {
      const parsed = JSON.parse(data) as OpenAIStreamChunk

      const delta = parsed.choices?.[0]?.delta
      const deltaContent = delta?.content ?? undefined

      // Extract streamed tool call argument fragments
      let deltaToolCalls: string | undefined
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          // First chunk has the function name
          if (tc.function?.name) {
            deltaToolCalls = (deltaToolCalls ?? '') + `Tool Call: ${tc.function.name}\n`
          }
          if (tc.function?.arguments) {
            deltaToolCalls = (deltaToolCalls ?? '') + tc.function.arguments
          }
        }
      }

      const usage = parsed.usage ?? undefined

      return { done: false, deltaContent, deltaToolCalls, parsed, usage }
    } catch {
      // Malformed JSON — skip
      return { done: false }
    }
  }

  // Fallback: some services send raw JSON lines without "data:" prefix
  if (line.startsWith('{')) {
    try {
      const parsed = JSON.parse(line) as OpenAIStreamChunk
      const delta = parsed.choices?.[0]?.delta
      const deltaContent = delta?.content ?? undefined
      let deltaToolCalls: string | undefined
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.arguments) {
            deltaToolCalls = (deltaToolCalls ?? '') + tc.function.arguments
          }
        }
      }
      const usage = parsed.usage ?? undefined
      return { done: false, deltaContent, deltaToolCalls, parsed, usage }
    } catch {
      return { done: false }
    }
  }

  return { done: false }
}
