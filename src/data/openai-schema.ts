import type { SchemaField } from '@/types/provider'

export const openaiRequestSchema: SchemaField[] = [
  {
    name: 'model',
    type: 'string',
    required: true,
    description:
      'ID of the model to use (e.g. gpt-4o, gpt-4o-mini, gpt-3.5-turbo).',
  },
  {
    name: 'messages',
    type: 'array',
    required: true,
    description:
      'A list of messages comprising the conversation so far. Each message is an object with a role and content.',
    children: [
      {
        name: 'role',
        type: 'string',
        required: true,
        description:
          'The role of the message author. One of system, user, assistant, or tool.',
      },
      {
        name: 'content',
        type: 'string | null',
        required: true,
        description:
          'The contents of the message. Content is required for all messages except assistant messages with tool calls.',
      },
      {
        name: 'name',
        type: 'string',
        required: false,
        description:
          'An optional name for the participant. Provides the model information to differentiate between participants of the same role.',
      },
    ],
  },
  {
    name: 'temperature',
    type: 'number',
    required: false,
    default: '1',
    description:
      'Sampling temperature between 0 and 2. Higher values like 0.8 make output more random, lower values like 0.2 make it more focused and deterministic.',
  },
  {
    name: 'top_p',
    type: 'number',
    required: false,
    default: '1',
    description:
      'Nucleus sampling parameter. The model considers the results of the tokens with top_p probability mass. 0.1 means only tokens comprising the top 10% probability mass are considered.',
  },
  {
    name: 'max_tokens',
    type: 'integer',
    required: false,
    description:
      'The maximum number of tokens that can be generated in the chat completion. The total length of input and output tokens is limited by the model context length.',
  },
  {
    name: 'stream',
    type: 'boolean',
    required: false,
    default: 'false',
    description:
      'If set, partial message deltas will be sent as server-sent events (SSE). Tokens will be sent as data-only events as they become available.',
  },
  {
    name: 'stream_options',
    type: 'object | null',
    required: false,
    description:
      'Options for streaming responses. Only set this when stream is set to true.',
    children: [
      {
        name: 'include_usage',
        type: 'boolean',
        required: false,
        description:
          'If set, an additional chunk will be streamed before the data: [DONE] message. The usage field on this chunk shows the token usage statistics for the entire request.',
      },
    ],
  },
  {
    name: 'frequency_penalty',
    type: 'number',
    required: false,
    default: '0',
    description:
      "Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.",
    providerNote: 'OpenAI only',
  },
  {
    name: 'presence_penalty',
    type: 'number',
    required: false,
    default: '0',
    description:
      "Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.",
    providerNote: 'OpenAI only',
  },
  {
    name: 'stop',
    type: 'string | array',
    required: false,
    description:
      'Up to 4 sequences where the API will stop generating further tokens.',
  },
  {
    name: 'n',
    type: 'integer',
    required: false,
    default: '1',
    description:
      'How many chat completion choices to generate for each input message. Note that you will be charged based on the number of generated tokens across all choices.',
  },
  {
    name: 'seed',
    type: 'integer',
    required: false,
    description:
      'If specified, the system will make a best effort to sample deterministically, such that repeated requests with the same seed and parameters should return the same result. Determinism is not guaranteed.',
  },
  {
    name: 'user',
    type: 'string',
    required: false,
    description:
      'A unique identifier representing your end-user, which can help OpenAI monitor and detect abuse.',
  },
]

export const openaiResponseSchema: SchemaField[] = [
  {
    name: 'id',
    type: 'string',
    required: true,
    description: 'A unique identifier for the chat completion.',
  },
  {
    name: 'object',
    type: 'string',
    required: true,
    description:
      'The object type, which is always "chat.completion" (or "chat.completion.chunk" for streaming).',
  },
  {
    name: 'created',
    type: 'integer',
    required: true,
    description:
      'The Unix timestamp (in seconds) of when the chat completion was created.',
  },
  {
    name: 'model',
    type: 'string',
    required: true,
    description: 'The model used for the chat completion.',
  },
  {
    name: 'system_fingerprint',
    type: 'string',
    required: false,
    description:
      'This fingerprint represents the backend configuration that the model runs with. Can be used in conjunction with the seed request parameter to understand when backend changes have been made that might impact determinism.',
  },
  {
    name: 'choices',
    type: 'array',
    required: true,
    description:
      'A list of chat completion choices. Can be more than one if n is greater than 1.',
    children: [
      {
        name: 'index',
        type: 'integer',
        required: true,
        description: 'The index of the choice in the list of choices.',
      },
      {
        name: 'message',
        type: 'object',
        required: true,
        description:
          'The chat completion message generated by the model (present in non-streaming responses).',
        children: [
          {
            name: 'role',
            type: 'string',
            required: true,
            description: 'The role of the author of this message.',
          },
          {
            name: 'content',
            type: 'string | null',
            required: true,
            description: 'The contents of the message.',
          },
          {
            name: 'refusal',
            type: 'string | null',
            required: false,
            description:
              'The refusal message generated by the model if the request was refused.',
          },
        ],
      },
      {
        name: 'delta',
        type: 'object',
        required: false,
        description:
          'A chat completion delta generated by streamed model responses (present in streaming responses).',
        providerNote: 'Streaming only',
        children: [
          {
            name: 'role',
            type: 'string',
            required: false,
            description:
              'The role of the author of this message. Only present in the first streamed chunk.',
          },
          {
            name: 'content',
            type: 'string',
            required: false,
            description: 'The contents of the chunk message.',
          },
        ],
      },
      {
        name: 'finish_reason',
        type: 'string',
        required: true,
        description:
          'The reason the model stopped generating tokens. "stop" if the model hit a natural stop point or a provided stop sequence, "length" if the maximum token count was reached, "content_filter" if content was omitted due to a flag from content filters.',
      },
    ],
  },
  {
    name: 'usage',
    type: 'object',
    required: true,
    description: 'Usage statistics for the completion request.',
    children: [
      {
        name: 'prompt_tokens',
        type: 'integer',
        required: true,
        description: 'Number of tokens in the prompt.',
      },
      {
        name: 'completion_tokens',
        type: 'integer',
        required: true,
        description: 'Number of tokens in the generated completion.',
      },
      {
        name: 'total_tokens',
        type: 'integer',
        required: true,
        description: 'Total number of tokens used in the request (prompt + completion).',
      },
    ],
  },
]
