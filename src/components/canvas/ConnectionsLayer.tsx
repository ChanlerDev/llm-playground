import { useState, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import type { CanvasBlock, Connection, Position, Viewport } from '@/types/canvas'

interface PreviewLine {
  fromBlock: CanvasBlock
  cursorPos: Position
}

interface ConnectionsLayerProps {
  connections: Connection[]
  blocks: CanvasBlock[]
  viewport: Viewport
  onDeleteConnection: (id: string) => void
  onUpdateConnection: (id: string, patch: Partial<Connection>) => void
  previewLine: PreviewLine | null
}

const HEADER_MID_Y = 18

function getBlockWidth(block: CanvasBlock): number {
  return block.kind === 'request-json' ? 360 : 320
}

function getBlockCenter(block: CanvasBlock): { x: number; y: number } {
  return {
    x: block.position.x + getBlockWidth(block) / 2,
    y: block.position.y + HEADER_MID_Y,
  }
}

function getConnectionPoints(
  from: CanvasBlock,
  to: CanvasBlock,
): { x1: number; y1: number; x2: number; y2: number } {
  const fromCenter = getBlockCenter(from)
  const toCenter = getBlockCenter(to)

  const dx = toCenter.x - fromCenter.x
  const x1 = fromCenter.x + (dx > 0 ? getBlockWidth(from) / 2 : -getBlockWidth(from) / 2)
  const x2 = toCenter.x + (dx > 0 ? -getBlockWidth(to) / 2 : getBlockWidth(to) / 2)

  return { x1, y1: fromCenter.y, x2, y2: toCenter.y }
}

function getNearestPort(block: CanvasBlock, target: Position): Position {
  const leftPort = { x: block.position.x, y: block.position.y + HEADER_MID_Y }
  const rightPort = { x: block.position.x + getBlockWidth(block), y: block.position.y + HEADER_MID_Y }

  const distLeft = Math.hypot(target.x - leftPort.x, target.y - leftPort.y)
  const distRight = Math.hypot(target.x - rightPort.x, target.y - rightPort.y)

  return distLeft < distRight ? leftPort : rightPort
}

function canvasToScreen(pos: Position, viewport: Viewport): Position {
  return {
    x: pos.x * viewport.zoom + viewport.x,
    y: pos.y * viewport.zoom + viewport.y,
  }
}

/** Inline label editor — auto-focused, saves on Enter/blur */
function LabelEditor({
  value,
  screenPos,
  onSave,
  onDelete,
}: {
  value: string
  screenPos: Position
  onSave: (label: string) => void
  onDelete: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    // Auto-focus with slight delay to avoid race with click
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])

  const commit = () => {
    onSave(draft)
  }

  return (
    <div
      className="absolute z-50 flex items-center gap-1"
      style={{
        left: screenPos.x,
        top: screenPos.y,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        className="w-24 border-b border-hairline bg-transparent px-0.5 text-center text-[11px] text-ink outline-none focus:border-primary"
        value={draft}
        placeholder="label"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            setDraft(value) // revert
            onSave(value)
          }
        }}
      />
      <button
        className="shrink-0 rounded p-0.5 text-muted opacity-60 transition-opacity hover:text-semantic-error hover:opacity-100"
        onMouseDown={(e) => {
          e.preventDefault() // prevent input blur race
          e.stopPropagation()
          onDelete()
        }}
        title="Delete connection"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  )
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

  // Compute editing position
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
      {/* SVG paths */}
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

                {/* Label text on the line (only when not editing) */}
                {conn.label && editingId !== conn.id && (
                  <text
                    x={midX}
                    y={midY - 6}
                    textAnchor="middle"
                    className="pointer-events-auto cursor-pointer select-none text-sm font-medium"
                    fill="var(--ink)"
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

      {/* HTML inline editor — outside SVG */}
      {editingConn && popoverScreenPos && (
        <LabelEditor
          key={editingConn.id}
          value={editingConn.label}
          screenPos={popoverScreenPos}
          onSave={(label) => {
            onUpdateConnection(editingConn.id, { label })
            setEditingId(null)
          }}
          onDelete={() => {
            onDeleteConnection(editingConn.id)
            setEditingId(null)
          }}
        />
      )}
    </>
  )
}
