export type ProviderType = 'openai' | 'anthropic'

export interface ProviderConfig {
  provider: ProviderType
  baseUrl: string
  apiKey: string
  model: string
}

export interface MessageToolCall {
  id: string
  function: {
    name: string
    arguments: string
  }
}

export interface Message {
  role: string
  content: string
  // OpenAI: assistant messages may carry tool_calls
  tool_calls?: MessageToolCall[]
  // OpenAI: tool-role messages must reference the call they answer
  tool_call_id?: string
  // Anthropic: assistant tool_use blocks
  anthropic_tool_use?: { id: string; name: string; input: unknown }[]
}

export interface RequestParams {
  temperature?: number
  maxTokens?: number
  topP?: number
  stream: boolean
  frequencyPenalty?: number   // OpenAI only
  presencePenalty?: number    // OpenAI only
  topK?: number              // Anthropic only
  stop?: string[]
}

export interface ToolParameter {
  name: string
  type: string
  description: string
  required: boolean
  enum?: string[]
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParameter[]
  enabled: boolean
}

export interface SSEChunk {
  id: string
  timestamp: number          // ms since request start
  raw: string                // raw SSE line
  parsed: unknown            // parsed JSON
  eventType?: string         // Anthropic named event type
  deltaContent?: string      // extracted text delta (if any)
}

export interface RequestStats {
  startTime: number
  ttfb: number | null
  endTime: number | null
  totalDuration: number | null
  chunkCount: number
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  tokensPerSecond: number | null
}

export interface SchemaField {
  name: string
  type: string
  required: boolean
  default?: string
  description: string
  children?: SchemaField[]
  providerNote?: string
}
