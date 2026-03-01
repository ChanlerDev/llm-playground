import type { ProviderType, SSEChunk, RequestStats, MessageToolCall } from '@/types/provider'
import { parseOpenAIStreamLine } from '@/services/openai-provider'
import { parseAnthropicStreamEvent } from '@/services/anthropic-provider'

export interface StreamCallbacks {
  onChunk: (chunk: SSEChunk) => void
  onStats: (stats: Partial<RequestStats>) => void
  onContent: (delta: string) => void
  onToolCall: (toolCall: MessageToolCall) => void
  onAnthropicToolUse: (toolUse: { id: string; name: string; input: unknown }) => void
  onDone: () => void
  onError: (error: Error) => void
}

export async function parseStream(
  response: Response,
  provider: ProviderType,
  callbacks: StreamCallbacks,
): Promise<void> {
  const { onChunk, onStats, onContent, onToolCall, onAnthropicToolUse, onDone, onError } = callbacks

  if (!response.body) {
    onError(new Error('Response body is null — streaming not supported'))
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const startTime = performance.now()

  let buffer = ''
  let chunkIndex = 0
  let ttfbRecorded = false
  let currentEventType = '' // For Anthropic event type tracking

  // Token tracking
  let promptTokens: number | null = null
  let completionTokens: number | null = null

  // OpenAI streaming tool call accumulation: keyed by tool_call index
  const openaiToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map()

  // Anthropic streaming tool_use accumulation
  let currentAnthropicToolUse: { id: string; name: string; arguments: string } | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process any remaining buffer content
        if (buffer.trim()) {
          processLines(buffer)
        }

        // Emit any accumulated OpenAI tool calls
        for (const [, tc] of openaiToolCalls) {
          onToolCall({ id: tc.id, function: { name: tc.name, arguments: tc.arguments } })
        }
        openaiToolCalls.clear()

        // Emit any remaining Anthropic tool_use
        if (currentAnthropicToolUse) {
          try {
            const input = JSON.parse(currentAnthropicToolUse.arguments)
            onAnthropicToolUse({ id: currentAnthropicToolUse.id, name: currentAnthropicToolUse.name, input })
          } catch {
            onAnthropicToolUse({ id: currentAnthropicToolUse.id, name: currentAnthropicToolUse.name, input: currentAnthropicToolUse.arguments })
          }
          currentAnthropicToolUse = null
        }

        const endTime = performance.now()
        const totalDuration = endTime - startTime

        const totalTokens =
          promptTokens != null && completionTokens != null
            ? promptTokens + completionTokens
            : null

        const tokensPerSecond =
          completionTokens != null && totalDuration > 0
            ? (completionTokens / totalDuration) * 1000
            : null

        onStats({
          endTime,
          totalDuration,
          chunkCount: chunkIndex,
          promptTokens,
          completionTokens,
          totalTokens,
          tokensPerSecond,
        })
        onDone()
        return
      }

      // Record TTFB on first data received
      if (!ttfbRecorded) {
        const ttfb = performance.now() - startTime
        ttfbRecorded = true
        onStats({ ttfb })
      }

      buffer += decoder.decode(value, { stream: true })

      // Split on newlines and process complete lines
      const lines = buffer.split('\n')
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop()!

      for (const line of lines) {
        processLine(line)
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      onDone()
    } else {
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  function processLines(text: string) {
    const lines = text.split('\n')
    for (const line of lines) {
      processLine(line)
    }
  }

  function processLine(line: string) {
    if (provider === 'openai') {
      processOpenAILine(line)
    } else {
      processAnthropicLine(line)
    }
  }

  function processOpenAILine(line: string) {
    const trimmed = line.trim()
    if (!trimmed) return

    // Also accept lines that might not have parsed but contain data
    const result = parseOpenAIStreamLine(trimmed)

    if (result.done) {
      return
    }

    if (result.parsed) {
      const chunk: SSEChunk = {
        id: `chunk-${chunkIndex++}`,
        timestamp: performance.now() - startTime,
        raw: trimmed,
        parsed: result.parsed,
        deltaContent: result.deltaContent ?? result.deltaToolCalls,
      }
      onChunk(chunk)

      if (result.deltaContent) {
        onContent(result.deltaContent)
      }
      if (result.deltaToolCalls) {
        onContent(result.deltaToolCalls)
      }

      // Accumulate OpenAI streaming tool calls by index
      const delta = (result.parsed as { choices?: { delta?: { tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[] }).choices?.[0]?.delta
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const existing = openaiToolCalls.get(tc.index)
          if (!existing) {
            openaiToolCalls.set(tc.index, {
              id: tc.id ?? '',
              name: tc.function?.name ?? '',
              arguments: tc.function?.arguments ?? '',
            })
          } else {
            if (tc.id) existing.id = tc.id
            if (tc.function?.name) existing.name = tc.function.name
            if (tc.function?.arguments) existing.arguments += tc.function.arguments
          }
        }
      }

      if (result.usage) {
        promptTokens = result.usage.prompt_tokens
        completionTokens = result.usage.completion_tokens
        onStats({
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
        })
      }
    }
  }

  function processAnthropicLine(line: string) {
    const trimmed = line.trim()
    if (!trimmed) return

    // Anthropic SSE format uses "event: <type>" followed by "data: <json>"
    if (trimmed.startsWith('event: ')) {
      currentEventType = trimmed.slice(7).trim()
      return
    }

    if (trimmed.startsWith('data:')) {
      const data = trimmed.startsWith('data: ') ? trimmed.slice(6).trim() : trimmed.slice(5).trim()
      const eventType = currentEventType
      currentEventType = '' // Reset for next event

      const result = parseAnthropicStreamEvent(eventType, data)

      if (result.done) {
        return
      }

      if (result.parsed) {
        const chunk: SSEChunk = {
          id: `chunk-${chunkIndex++}`,
          timestamp: performance.now() - startTime,
          raw: trimmed,
          parsed: result.parsed,
          eventType,
          deltaContent: result.deltaContent,
        }
        onChunk(chunk)

        if (result.deltaContent) {
          onContent(result.deltaContent)
        }

        // Accumulate Anthropic tool_use blocks
        const parsedData = result.parsed as Record<string, unknown>
        if (eventType === 'content_block_start') {
          // Emit any previously accumulated tool_use
          if (currentAnthropicToolUse) {
            try {
              const input = JSON.parse(currentAnthropicToolUse.arguments)
              onAnthropicToolUse({ id: currentAnthropicToolUse.id, name: currentAnthropicToolUse.name, input })
            } catch {
              onAnthropicToolUse({ id: currentAnthropicToolUse.id, name: currentAnthropicToolUse.name, input: currentAnthropicToolUse.arguments })
            }
            currentAnthropicToolUse = null
          }
          const block = parsedData.content_block as { type?: string; id?: string; name?: string } | undefined
          if (block?.type === 'tool_use' && block.id && block.name) {
            currentAnthropicToolUse = { id: block.id, name: block.name, arguments: '' }
          }
        } else if (eventType === 'content_block_delta') {
          const delta = parsedData.delta as { type?: string; partial_json?: string } | undefined
          if (delta?.type === 'input_json_delta' && delta.partial_json && currentAnthropicToolUse) {
            currentAnthropicToolUse.arguments += delta.partial_json
          }
        } else if (eventType === 'content_block_stop') {
          // Emit accumulated tool_use when block ends
          if (currentAnthropicToolUse) {
            try {
              const input = JSON.parse(currentAnthropicToolUse.arguments)
              onAnthropicToolUse({ id: currentAnthropicToolUse.id, name: currentAnthropicToolUse.name, input })
            } catch {
              onAnthropicToolUse({ id: currentAnthropicToolUse.id, name: currentAnthropicToolUse.name, input: currentAnthropicToolUse.arguments })
            }
            currentAnthropicToolUse = null
          }
        }

        if (result.usage) {
          // Anthropic sends input_tokens in message_start and output_tokens in message_delta
          if (result.usage.input_tokens > 0) {
            promptTokens = result.usage.input_tokens
          }
          if (result.usage.output_tokens > 0) {
            completionTokens = result.usage.output_tokens
          }

          onStats({
            promptTokens,
            completionTokens,
            totalTokens:
              promptTokens != null && completionTokens != null
                ? promptTokens + completionTokens
                : null,
          })
        }
      }
    }
  }
}
