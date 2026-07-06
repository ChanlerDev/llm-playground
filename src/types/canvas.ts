import type { Message, RequestParams, ToolDefinition } from './provider'

export interface Position {
  x: number
  y: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export type CanvasBlockKind = 'messages' | 'request' | 'assistant-output'

export interface BaseCanvasBlock {
  id: string
  kind: CanvasBlockKind
  title: string
  position: Position
  isCollapsed: boolean
}

export interface MessagesBlock extends BaseCanvasBlock {
  kind: 'messages'
  messages: Message[]
  systemPrompt: string
  isActive: boolean
}

export interface RequestBlock extends BaseCanvasBlock {
  kind: 'request'
  params: RequestParams
  tools: ToolDefinition[]
  modelOverride: string
  stopText: string
  advancedJson: string
}

export interface AssistantOutputBlock extends BaseCanvasBlock {
  kind: 'assistant-output'
  sourceBlockId: string
  content: string
  status: 'streaming' | 'complete' | 'error'
}

export type CanvasBlock = MessagesBlock | RequestBlock | AssistantOutputBlock

export interface Connection {
  id: string
  fromBlockId: string
  toBlockId: string
  label: string
  variant?: 'solid' | 'dashed'
}

export interface CanvasState {
  blocks: CanvasBlock[]
  connections: Connection[]
  viewport: Viewport
}

export function createBlock(position: Position, title?: string): MessagesBlock {
  return {
    id: crypto.randomUUID(),
    kind: 'messages',
    title: title ?? 'Untitled',
    position,
    messages: [{ role: 'user', content: '' }],
    systemPrompt: '',
    isActive: false,
    isCollapsed: false,
  }
}

export function createRequestBlock(position: Position, title?: string): RequestBlock {
  return {
    id: crypto.randomUUID(),
    kind: 'request',
    title: title ?? 'Request',
    position,
    params: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1,
      stream: true,
    },
    tools: [],
    modelOverride: '',
    stopText: '',
    advancedJson: '',
    isCollapsed: false,
  }
}

export function createAssistantOutputBlock(
  position: Position,
  sourceBlockId: string,
): AssistantOutputBlock {
  return {
    id: crypto.randomUUID(),
    kind: 'assistant-output',
    title: 'Assistant Output',
    position,
    sourceBlockId,
    content: '',
    status: 'streaming',
    isCollapsed: false,
  }
}

export function createConnection(
  fromBlockId: string,
  toBlockId: string,
  label: string = '',
  variant: 'solid' | 'dashed' = 'solid',
): Connection {
  return {
    id: crypto.randomUUID(),
    fromBlockId,
    toBlockId,
    label,
    variant,
  }
}
