import type { Message } from './provider'

export interface Position {
  x: number
  y: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export type CanvasBlockKind = 'messages' | 'request-json'

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

export interface JsonRequestBlock extends BaseCanvasBlock {
  kind: 'request-json'
  json: string
}

export type CanvasBlock = MessagesBlock | JsonRequestBlock

export interface Connection {
  id: string
  fromBlockId: string
  toBlockId: string
  label: string
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

export function createJsonRequestBlock(position: Position, title?: string): JsonRequestBlock {
  return {
    id: crypto.randomUUID(),
    kind: 'request-json',
    title: title ?? 'Request JSON',
    position,
    json: [
      '{',
      '  "temperature": 0.2,',
      '  "maxTokens": 1024,',
      '  "stream": true,',
      '  "tools": []',
      '}',
    ].join('\n'),
    isCollapsed: false,
  }
}

export function createConnection(
  fromBlockId: string,
  toBlockId: string,
  label: string = '',
): Connection {
  return {
    id: crypto.randomUUID(),
    fromBlockId,
    toBlockId,
    label,
  }
}
