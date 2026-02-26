export interface AnthropicRequest {
  model: string
  max_tokens: number
  messages: AnthropicMessage[]
  system?: string
  temperature?: number
  top_p?: number
  top_k?: number
  stream?: boolean
  stop_sequences?: string[]
}

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AnthropicResponse {
  id: string
  type: string
  role: string
  content: {
    type: string
    text: string
  }[]
  model: string
  stop_reason: string
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}
