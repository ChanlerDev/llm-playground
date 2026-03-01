export interface OpenAIRequest {
  model: string
  messages: Record<string, unknown>[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  max_completion_tokens?: number
  stream?: boolean
  stream_options?: { include_usage: boolean }
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string | string[]
  n?: number
  tools?: {
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }[]
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  name?: string
}

export interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  system_fingerprint?: string
  choices: {
    index: number
    message: {
      role: string
      content: string | null
      refusal?: string | null
      tool_calls?: OpenAIToolCall[]
    }
    finish_reason: string
    logprobs: unknown
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface OpenAIStreamChunk {
  id: string
  object: string
  created: number
  model: string
  system_fingerprint?: string
  choices: {
    index: number
    delta: {
      role?: string
      content?: string
      tool_calls?: {
        index: number
        id?: string
        type?: string
        function?: {
          name?: string
          arguments?: string
        }
      }[]
    }
    finish_reason: string | null
    logprobs: unknown
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
