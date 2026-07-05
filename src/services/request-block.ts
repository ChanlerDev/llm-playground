import type {
  RequestOverrides,
  RequestParams,
  ToolDefinition,
  ToolParameter,
} from '@/types/provider'
import type { CanvasBlock, Connection, JsonRequestBlock, MessagesBlock } from '@/types/canvas'

type JsonObject = Record<string, unknown>

type ParseResult =
  | { ok: true; overrides: RequestOverrides }
  | { ok: false; error: string }

const PARAM_KEYS: Record<string, keyof RequestParams> = {
  temperature: 'temperature',
  maxTokens: 'maxTokens',
  topP: 'topP',
  stream: 'stream',
  frequencyPenalty: 'frequencyPenalty',
  presencePenalty: 'presencePenalty',
  topK: 'topK',
  stop: 'stop',
}

function normalizeParamValue(key: keyof RequestParams, value: unknown): unknown {
  if (key === 'stream') {
    if (typeof value !== 'boolean') throw new Error('stream must be a boolean')
    return value
  }
  if (key === 'stop') {
    const values = stringArray(value)
    if (!values) throw new Error('stop must be an array of strings')
    return values
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number`)
  }
  return value
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : undefined
}

function schemaParametersToList(schema: unknown): ToolParameter[] | null {
  if (!isObject(schema)) return null
  const properties = isObject(schema.properties) ? schema.properties : {}
  const required = new Set(stringArray(schema.required) ?? [])

  return Object.entries(properties).map(([name, prop]) => {
    const propObject = isObject(prop) ? prop : {}
    return {
      name,
      type: typeof propObject.type === 'string' ? propObject.type : 'string',
      description: typeof propObject.description === 'string' ? propObject.description : '',
      required: required.has(name),
      enum: stringArray(propObject.enum),
    }
  })
}

function normalizeParameter(value: unknown, index: number): ToolParameter {
  if (!isObject(value)) {
    throw new Error(`tools[].parameters[${index}] must be an object`)
  }
  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error(`tools[].parameters[${index}].name is required`)
  }

  return {
    name: value.name.trim(),
    type: typeof value.type === 'string' && value.type.trim() ? value.type.trim() : 'string',
    description: typeof value.description === 'string' ? value.description : '',
    required: typeof value.required === 'boolean' ? value.required : false,
    enum: stringArray(value.enum),
  }
}

function normalizeTool(value: unknown, index: number): ToolDefinition {
  if (!isObject(value)) {
    throw new Error(`tools[${index}] must be an object`)
  }

  if (value.type === 'function' && isObject(value.function)) {
    const fn = value.function
    if (typeof fn.name !== 'string' || fn.name.trim() === '') {
      throw new Error(`tools[${index}].function.name is required`)
    }
    return {
      name: fn.name.trim(),
      description: typeof fn.description === 'string' ? fn.description : '',
      parameters: schemaParametersToList(fn.parameters) ?? [],
      enabled: value.enabled !== false,
    }
  }

  const inputSchema = value.input_schema ?? value.parameters
  const schemaParameters = schemaParametersToList(inputSchema)

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error(`tools[${index}].name is required`)
  }

  return {
    name: value.name.trim(),
    description: typeof value.description === 'string' ? value.description : '',
    parameters: schemaParameters ?? (Array.isArray(value.parameters)
      ? value.parameters.map(normalizeParameter)
      : []),
    enabled: value.enabled !== false,
  }
}

export function parseJsonRequestBlock(json: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    }
  }

  if (!isObject(parsed)) {
    return { ok: false, error: 'JSON Request Block must contain a JSON object.' }
  }

  if (Object.prototype.hasOwnProperty.call(parsed, 'messages')) {
    return { ok: false, error: 'JSON Request Block cannot override messages.' }
  }

  try {
    const params: Partial<RequestParams> = {}
    const body: JsonObject = {}
    let tools: ToolDefinition[] | undefined

    for (const [key, value] of Object.entries(parsed)) {
      if (key === 'tools') {
        if (!Array.isArray(value)) {
          return { ok: false, error: 'tools must be an array.' }
        }
        tools = value.map(normalizeTool)
        continue
      }

      const paramKey = PARAM_KEYS[key]
      if (paramKey) {
        ;(params[paramKey] as unknown) = normalizeParamValue(paramKey, value)
        continue
      }

      body[key] = value
    }

    return {
      ok: true,
      overrides: {
        ...(Object.keys(params).length > 0 ? { params } : {}),
        ...(tools ? { tools } : {}),
        ...(Object.keys(body).length > 0 ? { body } : {}),
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid request JSON',
    }
  }
}

export function findAttachedJsonRequestBlocks(
  messageBlockId: string,
  blocks: CanvasBlock[],
  connections: Connection[],
): JsonRequestBlock[] {
  const blockById = new Map(blocks.map((block) => [block.id, block]))
  const attached: JsonRequestBlock[] = []

  for (const connection of connections) {
    const touchesMessage =
      connection.fromBlockId === messageBlockId || connection.toBlockId === messageBlockId
    if (!touchesMessage) continue

    const otherId =
      connection.fromBlockId === messageBlockId ? connection.toBlockId : connection.fromBlockId
    const other = blockById.get(otherId)
    if (other?.kind === 'request-json') {
      attached.push(other)
    }
  }

  return attached
}

export function resolveRequestOverridesForBlock(
  messageBlock: MessagesBlock,
  blocks: CanvasBlock[],
  connections: Connection[],
): ParseResult {
  const attached = findAttachedJsonRequestBlocks(messageBlock.id, blocks, connections)
  if (attached.length === 0) return { ok: true, overrides: {} }
  if (attached.length > 1) {
    return {
      ok: false,
      error: `Only one JSON Request Block can attach to "${messageBlock.title}".`,
    }
  }
  return parseJsonRequestBlock(attached[0].json)
}
