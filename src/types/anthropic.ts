export interface AnthropicRequest {
  model: string
  max_tokens: number
  messages: Record<string, unknown>[]
  system?: string
  temperature?: number
  top_p?: number
  top_k?: number
  stream?: boolean
  stop_sequences?: string[]
  tools?: {
    name: string
    description: string
    input_schema: Record<string, unknown>
  }[]
}

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | unknown[]
}

export interface AnthropicTextContentBlock {
  type: 'text'
  text: string
}

export interface AnthropicToolUseContentBlock {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

export type AnthropicContentBlock =
  | AnthropicTextContentBlock
  | AnthropicToolUseContentBlock

export interface AnthropicResponse {
  id: string
  type: string
  role: string
  content: AnthropicContentBlock[]
  model: string
  stop_reason: string
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}
