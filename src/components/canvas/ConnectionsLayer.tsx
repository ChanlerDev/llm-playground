import { useState } from 'react'
import { X } from 'lucide-react'
import type { Connection, MessagesBlock, Viewport } from '@/types/canvas'

interface ConnectionsLayerProps {
  connections: Connection[]
  blocks: MessagesBlock[]
  viewport: Viewport
  onDeleteConnection: (id: string) => void
  onUpdateConnection: (id: string, patch: Partial<Connection>) => void
}

const BLOCK_WIDTH = 320

function getBlockCenter(block: MessagesBlock): { x: number; y: number } {
  return {
    x: block.position.x + BLOCK_WIDTH / 2,
    y: block.position.y + 30, // header midpoint
  }
}

function getConnectionPoints(
  from: MessagesBlock,
  to: MessagesBlock,
): { x1: number; y1: number; x2: number; y2: number } {
  const fromCenter = getBlockCenter(from)
  const toCenter = getBlockCenter(to)

  // Simple: connect from right edge of "from" to left edge of "to"
  // or use center-to-center with offset
  const dx = toCenter.x - fromCenter.x
  const x1 = fromCenter.x + (dx > 0 ? BLOCK_WIDTH / 2 : -BLOCK_WIDTH / 2)
  const x2 = toCenter.x + (dx > 0 ? -BLOCK_WIDTH / 2 : BLOCK_WIDTH / 2)

  return { x1, y1: fromCenter.y, x2, y2: toCenter.y }
}

export function ConnectionsLayer({
  connections,
  blocks,
  viewport,
  onDeleteConnection,
  onUpdateConnection,
}: ConnectionsLayerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (connections.length === 0) return null

  return (
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

          // Bezier control points for curved arrow
          const cpx1 = x1 + (x2 - x1) * 0.4
          const cpy1 = y1
          const cpx2 = x1 + (x2 - x1) * 0.6
          const cpy2 = y2

          return (
            <g key={conn.id}>
              {/* Path */}
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

              {/* Hit area (wider for easier clicking) */}
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

              {/* Edit popover */}
              {editingId === conn.id && (
                <foreignObject
                  x={midX - 80}
                  y={midY - 40}
                  width={160}
                  height={36}
                  className="pointer-events-auto"
                >
                  <div className="flex items-center gap-1 rounded-md border border-hairline bg-surface-card p-1 shadow-none">
                    <input
                      className="min-w-0 flex-1 bg-transparent px-1 text-[11px] text-ink outline-none"
                      value={conn.label}
                      placeholder="Label..."
                      onChange={(e) =>
                        onUpdateConnection(conn.id, { label: e.target.value })
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      className="shrink-0 rounded p-0.5 text-muted hover:text-semantic-error"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteConnection(conn.id)
                        setEditingId(null)
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                </foreignObject>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
