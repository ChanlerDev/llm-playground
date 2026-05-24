import { useState } from 'react'
import { X } from 'lucide-react'
import type { Connection, MessagesBlock, Position, Viewport } from '@/types/canvas'

interface PreviewLine {
  fromBlock: MessagesBlock
  cursorPos: Position
}

interface ConnectionsLayerProps {
  connections: Connection[]
  blocks: MessagesBlock[]
  viewport: Viewport
  onDeleteConnection: (id: string) => void
  onUpdateConnection: (id: string, patch: Partial<Connection>) => void
  previewLine: PreviewLine | null
}

const BLOCK_WIDTH = 320
const HEADER_MID_Y = 18

function getBlockCenter(block: MessagesBlock): { x: number; y: number } {
  return {
    x: block.position.x + BLOCK_WIDTH / 2,
    y: block.position.y + HEADER_MID_Y,
  }
}

function getConnectionPoints(
  from: MessagesBlock,
  to: MessagesBlock,
): { x1: number; y1: number; x2: number; y2: number } {
  const fromCenter = getBlockCenter(from)
  const toCenter = getBlockCenter(to)

  const dx = toCenter.x - fromCenter.x
  const x1 = fromCenter.x + (dx > 0 ? BLOCK_WIDTH / 2 : -BLOCK_WIDTH / 2)
  const x2 = toCenter.x + (dx > 0 ? -BLOCK_WIDTH / 2 : BLOCK_WIDTH / 2)

  return { x1, y1: fromCenter.y, x2, y2: toCenter.y }
}

/** Pick the port (left or right) on `block` that's closest to `target` point */
function getNearestPort(block: MessagesBlock, target: Position): Position {
  const leftPort = { x: block.position.x, y: block.position.y + HEADER_MID_Y }
  const rightPort = { x: block.position.x + BLOCK_WIDTH, y: block.position.y + HEADER_MID_Y }

  const distLeft = Math.hypot(target.x - leftPort.x, target.y - leftPort.y)
  const distRight = Math.hypot(target.x - rightPort.x, target.y - rightPort.y)

  return distLeft < distRight ? leftPort : rightPort
}

/** Convert canvas (world) coords to screen pixel coords */
function canvasToScreen(pos: Position, viewport: Viewport): Position {
  return {
    x: pos.x * viewport.zoom + viewport.x,
    y: pos.y * viewport.zoom + viewport.y,
  }
}

export function ConnectionsLayer({
  connections,
  blocks,
  viewport,
  onDeleteConnection,
  onUpdateConnection,
  previewLine,
}: ConnectionsLayerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const hasContent = connections.length > 0 || previewLine !== null
  if (!hasContent) return null

  // Compute editing popover position in screen coords
  const editingConn = editingId ? connections.find(c => c.id === editingId) : null
  let popoverScreenPos: Position | null = null
  if (editingConn) {
    const fromBlock = blocks.find(b => b.id === editingConn.fromBlockId)
    const toBlock = blocks.find(b => b.id === editingConn.toBlockId)
    if (fromBlock && toBlock) {
      const { x1, y1, x2, y2 } = getConnectionPoints(fromBlock, toBlock)
      const midCanvas = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
      popoverScreenPos = canvasToScreen(midCanvas, viewport)
    }
  }

  return (
    <>
      {/* SVG layer for paths */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 1 }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="var(--muted)"
            />
          </marker>
        </defs>

        <g
          transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}
        >
          {connections.map((conn) => {
            const fromBlock = blocks.find((b) => b.id === conn.fromBlockId)
            const toBlock = blocks.find((b) => b.id === conn.toBlockId)
            if (!fromBlock || !toBlock) return null

            const { x1, y1, x2, y2 } = getConnectionPoints(fromBlock, toBlock)
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2

            const cpx1 = x1 + (x2 - x1) * 0.4
            const cpy1 = y1
            const cpx2 = x1 + (x2 - x1) * 0.6
            const cpy2 = y2

            return (
              <g key={conn.id}>
                <path
                  d={`M ${x1} ${y1} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth={1.5}
                  markerEnd="url(#arrowhead)"
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingId(editingId === conn.id ? null : conn.id)
                  }}
                />

                {/* Wider hit area */}
                <path
                  d={`M ${x1} ${y1} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingId(editingId === conn.id ? null : conn.id)
                  }}
                />

                {/* Label */}
                {conn.label && (
                  <text
                    x={midX}
                    y={midY - 8}
                    textAnchor="middle"
                    className="pointer-events-auto cursor-pointer text-[11px]"
                    fill="var(--muted)"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingId(conn.id)
                    }}
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Preview line */}
          {previewLine && (() => {
            const port = getNearestPort(previewLine.fromBlock, previewLine.cursorPos)
            const x1 = port.x
            const y1 = port.y
            const x2 = previewLine.cursorPos.x
            const y2 = previewLine.cursorPos.y

            const cpx1 = x1 + (x2 - x1) * 0.4
            const cpy1 = y1
            const cpx2 = x1 + (x2 - x1) * 0.6
            const cpy2 = y2

            return (
              <path
                d={`M ${x1} ${y1} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${x2} ${y2}`}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={1.5}
                strokeDasharray="8 4"
                markerEnd="url(#arrowhead)"
                className="connection-preview"
              />
            )
          })()}
        </g>

        <style>{`
          @keyframes dash-flow {
            to { stroke-dashoffset: -20; }
          }
          .connection-preview {
            animation: dash-flow 0.5s linear infinite;
          }
        `}</style>
      </svg>

      {/* HTML popover for editing — outside SVG to avoid foreignObject issues */}
      {editingConn && popoverScreenPos && (
        <div
          className="absolute z-50"
          style={{
            left: popoverScreenPos.x - 80,
            top: popoverScreenPos.y - 40,
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 rounded-md border border-hairline bg-surface-card p-1.5 shadow-sm">
            <input
              className="min-w-0 flex-1 bg-transparent px-1 text-[11px] text-ink outline-none"
              value={editingConn.label}
              placeholder="Label..."
              onChange={(e) =>
                onUpdateConnection(editingConn.id, { label: e.target.value })
              }
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="shrink-0 rounded p-1 text-muted hover:bg-canvas-soft hover:text-semantic-error"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteConnection(editingConn.id)
                setEditingId(null)
              }}
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
