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

export interface MessagesBlock {
  id: string
  title: string
  position: Position
  messages: Message[]
  systemPrompt: string
  isActive: boolean
  isCollapsed: boolean
}

export interface Connection {
  id: string
  fromBlockId: string
  toBlockId: string
  label: string
}

export interface CanvasState {
  blocks: MessagesBlock[]
  connections: Connection[]
  viewport: Viewport
}

export function createBlock(position: Position, title?: string): MessagesBlock {
  return {
    id: crypto.randomUUID(),
    title: title ?? 'Untitled',
    position,
    messages: [{ role: 'user', content: '' }],
    systemPrompt: '',
    isActive: false,
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
