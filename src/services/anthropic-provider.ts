import type { Message, RequestParams, ToolDefinition } from '@/types/provider'
import type { AnthropicRequest } from '@/types/anthropic'

function toolsToInputSchema(tool: ToolDefinition): Record<string, unknown> {
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

export function buildAnthropicRequest(
  config: { baseUrl: string; apiKey: string; model: string },
  messages: Message[],
  params: RequestParams,
  tools?: ToolDefinition[],
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
    messages: filteredMessages.map((m) => {
      // Assistant messages with tool_use blocks need content as an array
      if (m.role === 'assistant' && m.anthropic_tool_use?.length) {
        const contentBlocks: unknown[] = []
        if (m.content) {
          contentBlocks.push({ type: 'text', text: m.content })
        }
        for (const tu of m.anthropic_tool_use) {
          contentBlocks.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input })
        }
        return { role: 'assistant' as const, content: contentBlocks }
      }
      // Tool result messages are user role with tool_result content blocks
      if (m.role === 'tool' && m.tool_call_id) {
        return {
          role: 'user' as const,
          content: [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }],
        }
      }
      return {
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }
    }),
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

  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: toolsToInputSchema(t),
    }))
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

    // content_block_start announces a new block — for tool_use, emit the tool name
    if (eventType === 'content_block_start') {
      const block = parsed.content_block as { type?: string; name?: string } | undefined
      if (block?.type === 'tool_use' && block.name) {
        return { done: false, deltaContent: `Tool Call: ${block.name}\n`, parsed }
      }
      return { done: false, parsed }
    }

    if (eventType === 'content_block_delta') {
      const delta = parsed.delta as { type?: string; text?: string; partial_json?: string } | undefined
      if (delta?.type === 'text_delta') {
        return { done: false, deltaContent: delta.text, parsed }
      }
      // Anthropic streams tool arguments as input_json_delta fragments
      if (delta?.type === 'input_json_delta' && delta.partial_json) {
        return { done: false, deltaContent: delta.partial_json, parsed }
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
