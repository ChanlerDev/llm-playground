import { useCallback, useRef, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Link,
  Settings2,
  Trash2,
  Wrench,
} from 'lucide-react'
import type { Position, RequestBlock } from '@/types/canvas'
import type { RequestParams, ToolDefinition } from '@/types/provider'
import { parseAdvancedJsonPatch } from '@/services/request-block'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { ConnectionMode } from './Canvas'

const TOOL_PRESETS: ToolDefinition[] = [
  {
    presetId: 'web-search',
    name: 'search',
    description: 'Search the web for up-to-date information.',
    enabled: true,
    parameters: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
    ],
  },
  {
    presetId: 'weather',
    name: 'get_weather',
    description: 'Get weather for a location.',
    enabled: true,
    parameters: [
      { name: 'location', type: 'string', description: 'City or region', required: true },
      {
        name: 'unit',
        type: 'string',
        description: 'Temperature unit',
        required: false,
        enum: ['celsius', 'fahrenheit'],
      },
    ],
  },
  {
    presetId: 'calculator',
    name: 'calculate',
    description: 'Evaluate a mathematical expression.',
    enabled: true,
    parameters: [
      { name: 'expression', type: 'string', description: 'Expression to evaluate', required: true },
    ],
  },
  {
    presetId: 'file-lookup',
    name: 'lookup_file',
    description: 'Look up relevant content from a named file.',
    enabled: true,
    parameters: [
      { name: 'path', type: 'string', description: 'File path', required: true },
      { name: 'query', type: 'string', description: 'Lookup query', required: false },
    ],
  },
]

interface RequestConfigBlockProps {
  block: RequestBlock
  isConnectionTarget: boolean
  connectionMode: ConnectionMode
  onMove: (position: Position) => void
  onUpdate: (patch: Partial<RequestBlock>) => void
  onDelete: () => void
  onDuplicate: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onConnectionButtonStart: () => void
  onPortDragStart: (clientX: number, clientY: number) => void
  onBlockHover: (entering: boolean) => void
  onBlockClickForConnection: () => void
  zoom: number
}

function numberValue(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback
}

export function RequestConfigBlock({
  block,
  isConnectionTarget,
  connectionMode,
  onMove,
  onUpdate,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragEnd,
  onConnectionButtonStart,
  onPortDragStart,
  onBlockHover,
  onBlockClickForConnection,
  zoom,
}: RequestConfigBlockProps) {
  const dragRef = useRef<{ startX: number; startY: number; blockX: number; blockY: number } | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const advancedResult = parseAdvancedJsonPatch(block.advancedJson)

  const isInConnectionMode = connectionMode.type !== 'idle'
  const isSourceBlock = isInConnectionMode && connectionMode.fromBlockId === block.id
  const borderClass = isConnectionTarget
    ? 'border-primary ring-2 ring-primary/30'
    : isSourceBlock
      ? 'border-primary/50'
      : advancedResult.ok
        ? 'border-hairline'
        : 'border-semantic-error'

  const updateParams = useCallback(
    (patch: Partial<RequestParams>) => {
      onUpdate({ params: { ...block.params, ...patch } })
    },
    [block.params, onUpdate],
  )

  const togglePreset = useCallback(
    (preset: ToolDefinition) => {
      const exists = block.tools.some((tool) => tool.presetId === preset.presetId)
      onUpdate({
        tools: exists
          ? block.tools.filter((tool) => tool.presetId !== preset.presetId)
          : [...block.tools, structuredClone(preset)],
      })
    },
    [block.tools, onUpdate],
  )

  const toggleTool = useCallback(
    (name: string) => {
      onUpdate({
        tools: block.tools.map((tool) =>
          tool.name === name ? { ...tool, enabled: !tool.enabled } : tool,
        ),
      })
    },
    [block.tools, onUpdate],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-drag-handle]')) return
      e.preventDefault()
      e.stopPropagation()
      onDragStart()
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        blockX: block.position.x,
        blockY: block.position.y,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [block.position, onDragStart],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      const dx = (e.clientX - dragRef.current.startX) / zoom
      const dy = (e.clientY - dragRef.current.startY) / zoom
      onMove({ x: dragRef.current.blockX + dx, y: dragRef.current.blockY + dy })
    },
    [zoom, onMove],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      dragRef.current = null
      onDragEnd()
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    },
    [onDragEnd],
  )

  const handleTitleChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const title = e.target.value.trim()
      if (title) onUpdate({ title })
      setIsEditingTitle(false)
    },
    [onUpdate],
  )

  const handlePortPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onPortDragStart(e.clientX, e.clientY)
    },
    [onPortDragStart],
  )

  const handleBlockClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (connectionMode.type === 'button' && connectionMode.fromBlockId !== block.id) {
        onBlockClickForConnection()
      }
    },
    [connectionMode, block.id, onBlockClickForConnection],
  )

  return (
    <div
      className={`group/block absolute select-none rounded-lg border bg-surface-card shadow-none transition-[border-color,box-shadow] duration-150 ${borderClass}`}
      style={{ left: block.position.x, top: block.position.y, width: 380, minHeight: 60 }}
      onClick={handleBlockClick}
      onPointerEnter={() => onBlockHover(true)}
      onPointerLeave={() => onBlockHover(false)}
    >
      <div
        className="absolute left-0 top-[18px] z-10 -translate-x-1/2 opacity-0 transition-opacity group-hover/block:opacity-100"
        onPointerDown={handlePortPointerDown}
      >
        <div className="flex h-4 w-4 cursor-crosshair items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-muted bg-surface-card transition-colors hover:border-primary hover:bg-primary/20" />
        </div>
      </div>
      <div
        className="absolute right-0 top-[18px] z-10 translate-x-1/2 opacity-0 transition-opacity group-hover/block:opacity-100"
        onPointerDown={handlePortPointerDown}
      >
        <div className="flex h-4 w-4 cursor-crosshair items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-muted bg-surface-card transition-colors hover:border-primary hover:bg-primary/20" />
        </div>
      </div>

      <div
        className="flex items-center gap-1 border-b border-hairline-soft px-2 py-1.5"
        data-drag-handle
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-soft" data-drag-handle />
        <button
          className="shrink-0 text-muted hover:text-ink"
          onClick={(e) => {
            e.stopPropagation()
            onUpdate({ isCollapsed: !block.isCollapsed })
          }}
        >
          {block.isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        <Settings2 className="size-3.5 shrink-0 text-primary" />

        {isEditingTitle ? (
          <input
            className="min-w-0 flex-1 bg-transparent text-body-sm font-medium text-ink outline-none"
            defaultValue={block.title}
            autoFocus
            onBlur={handleTitleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="min-w-0 flex-1 cursor-text truncate text-body-sm font-medium text-ink"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setIsEditingTitle(true)
            }}
          >
            {block.title}
          </span>
        )}

        <span className="shrink-0 rounded-pill bg-surface-strong px-1.5 py-0.5 text-[10px] text-muted">
          {block.tools.filter((tool) => tool.enabled).length} tools
        </span>

        <div className="flex shrink-0 items-center gap-0.5">
          <button className="rounded p-0.5 text-muted hover:bg-canvas-soft hover:text-ink" onClick={(e) => { e.stopPropagation(); onConnectionButtonStart() }} title="Attach request">
            <Link className="size-3" />
          </button>
          <button className="rounded p-0.5 text-muted hover:bg-canvas-soft hover:text-ink" onClick={(e) => { e.stopPropagation(); onDuplicate() }} title="Duplicate">
            <Copy className="size-3" />
          </button>
          <button className="rounded p-0.5 text-muted hover:bg-canvas-soft hover:text-semantic-error" onClick={(e) => { e.stopPropagation(); onDelete() }} title="Delete">
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>

      {!block.isCollapsed && (
        <div className="max-h-[460px] overflow-y-auto p-3" data-scrollable>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted">Model override</Label>
              <Input
                value={block.modelOverride}
                placeholder="Use provider default"
                className="h-7 text-[12px]"
                onChange={(e) => onUpdate({ modelOverride: e.target.value })}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted">Max output</Label>
              <Input
                type="number"
                min={1}
                value={numberValue(block.params.maxTokens, 4096)}
                className="h-7 text-[12px]"
                onChange={(e) => updateParams({ maxTokens: Number(e.target.value) })}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted">Temperature</Label>
              <Input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={numberValue(block.params.temperature, 0.7)}
                className="h-7 text-[12px]"
                onChange={(e) => updateParams({ temperature: Number(e.target.value) })}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted">Top P</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={numberValue(block.params.topP, 1)}
                className="h-7 text-[12px]"
                onChange={(e) => updateParams({ topP: Number(e.target.value) })}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded border border-hairline bg-canvas-soft px-2 py-1.5">
            <div>
              <div className="text-[12px] font-medium text-ink">Stream response</div>
              <div className="text-[11px] text-muted">Updates the assistant output block while tokens arrive.</div>
            </div>
            <Switch
              checked={block.params.stream}
              onCheckedChange={(stream) => updateParams({ stream })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="mt-3 space-y-1">
            <Label className="text-[11px] text-muted">Stop sequences</Label>
            <textarea
              className="min-h-14 w-full resize-y rounded border border-hairline bg-canvas-soft p-2 font-mono text-[12px] leading-5 text-ink outline-none focus:border-primary"
              value={block.stopText}
              placeholder="One sequence per line"
              onChange={(e) => onUpdate({ stopText: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-soft">
              <Wrench className="size-3" />
              Tool presets
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {TOOL_PRESETS.map((preset) => {
                const selected = block.tools.some((tool) => tool.presetId === preset.presetId)
                return (
                  <button
                    key={preset.presetId}
                    className={`rounded border px-2 py-1.5 text-left text-[12px] transition-colors ${selected ? 'border-primary bg-primary/10 text-ink' : 'border-hairline bg-canvas-soft text-muted hover:text-ink'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePreset(preset)
                    }}
                  >
                    {preset.name}
                  </button>
                )
              })}
            </div>

            {block.tools.length > 0 && (
              <div className="space-y-1">
                {block.tools.map((tool) => (
                  <label
                    key={tool.name}
                    className="flex items-center justify-between rounded border border-hairline bg-surface-card px-2 py-1 text-[12px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="min-w-0 truncate">
                      {tool.name}
                      <span className="ml-1 text-[10px] text-muted">{tool.parameters.length} params</span>
                    </span>
                    <Switch checked={tool.enabled} onCheckedChange={() => toggleTool(tool.name)} />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 border-t border-hairline-soft pt-2">
            <button
              className="flex w-full items-center justify-between text-[11px] font-medium text-muted hover:text-ink"
              onClick={(e) => {
                e.stopPropagation()
                setShowAdvanced(!showAdvanced)
              }}
            >
              Advanced JSON patch
              {showAdvanced ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </button>
            {showAdvanced && (
              <textarea
                className="mt-2 min-h-24 w-full resize-y rounded border border-hairline bg-canvas-soft p-2 font-mono text-[12px] leading-5 text-ink outline-none focus:border-primary"
                value={block.advancedJson}
                placeholder={'{ "tool_choice": "auto" }'}
                onChange={(e) => onUpdate({ advancedJson: e.target.value })}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {!advancedResult.ok && (
              <div className="mt-2 flex items-start gap-1.5 text-[11px] text-semantic-error">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span className="min-w-0 break-words">{advancedResult.error}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
