import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import type { ToolDefinition, ToolParameter } from '@/types/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ToolsEditorProps {
  tools: ToolDefinition[]
  setTools: (tools: ToolDefinition[]) => void
}

const PARAM_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object']

function ParameterRow({
  param,
  onChange,
  onRemove,
}: {
  param: ToolParameter
  onChange: (param: ToolParameter) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-hairline bg-canvas p-2">
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_100px] gap-2">
        <Input
          value={param.name}
          onChange={(e) => onChange({ ...param, name: e.target.value })}
          placeholder="param_name"
          className="h-7 border-hairline bg-surface-card font-mono text-xs"
        />
        <Select
          value={param.type}
          onValueChange={(v) => onChange({ ...param, type: v })}
        >
          <SelectTrigger className="h-7 border-hairline bg-surface-card text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARAM_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={param.description}
          onChange={(e) => onChange({ ...param, description: e.target.value })}
          placeholder="Description"
          className="col-span-2 h-7 border-hairline bg-surface-card text-xs"
        />
        <div className="col-span-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Switch
              checked={param.required}
              onCheckedChange={(checked) =>
                onChange({ ...param, required: checked })
              }
              className="scale-75"
            />
            <span className="text-[10px] text-muted">Required</span>
          </div>
          <Input
            value={param.enum?.join(', ') ?? ''}
            onChange={(e) => {
              const val = e.target.value
              onChange({
                ...param,
                enum: val ? val.split(',').map((s) => s.trim()) : undefined,
              })
            }}
            placeholder="Enum: val1, val2, ..."
            className="h-7 flex-1 border-hairline bg-surface-card text-xs"
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-0.5 size-7 shrink-0 p-0 text-muted hover:text-semantic-error"
        onClick={onRemove}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  )
}

function ToolCard({
  tool,
  onChange,
  onRemove,
}: {
  tool: ToolDefinition
  onChange: (tool: ToolDefinition) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  const updateParam = (index: number, param: ToolParameter) => {
    const next = [...tool.parameters]
    next[index] = param
    onChange({ ...tool, parameters: next })
  }

  const removeParam = (index: number) => {
    onChange({ ...tool, parameters: tool.parameters.filter((_, i) => i !== index) })
  }

  const addParam = () => {
    onChange({
      ...tool,
      parameters: [
        ...tool.parameters,
        { name: '', type: 'string', description: '', required: false },
      ],
    })
  }

  return (
    <div className={`rounded-lg border bg-surface-card ${tool.enabled ? 'border-hairline' : 'border-hairline/50 opacity-60'}`}>
      {/* Tool header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          type="checkbox"
          checked={tool.enabled}
          onChange={(e) => onChange({ ...tool, enabled: e.target.checked })}
          className="size-3.5 shrink-0 cursor-pointer rounded border-hairline-strong bg-surface-strong accent-primary"
          title={tool.enabled ? 'Enabled — will be sent in request' : 'Disabled — will not be sent'}
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-muted hover:text-ink"
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        <Input
          value={tool.name}
          onChange={(e) => onChange({ ...tool, name: e.target.value })}
          placeholder="function_name"
          className="h-7 border-hairline bg-canvas font-mono text-xs"
        />
        <Badge variant="outline" className="shrink-0 text-[10px] text-muted">
          {tool.parameters.length} params
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 shrink-0 p-0 text-muted hover:text-semantic-error"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="space-y-3 border-t border-hairline px-3 py-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted">
              Description
            </Label>
            <Textarea
              value={tool.description}
              onChange={(e) => onChange({ ...tool, description: e.target.value })}
              placeholder="What does this tool do?"
              className="min-h-[60px] border-hairline bg-canvas text-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wider text-muted">
                Parameters
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted hover:text-ink"
                onClick={addParam}
              >
                <Plus className="mr-1 size-3" />
                Add
              </Button>
            </div>

            {tool.parameters.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-soft">
                No parameters — click Add to define inputs
              </p>
            ) : (
              <div className="space-y-2">
                {tool.parameters.map((param, i) => (
                  <ParameterRow
                    key={i}
                    param={param}
                    onChange={(p) => updateParam(i, p)}
                    onRemove={() => removeParam(i)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ToolsEditor({ tools, setTools }: ToolsEditorProps) {
  const updateTool = (index: number, tool: ToolDefinition) => {
    const next = [...tools]
    next[index] = tool
    setTools(next)
  }

  const removeTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index))
  }

  const addTool = () => {
    setTools([
      ...tools,
      {
        name: '',
        description: '',
        parameters: [],
        enabled: true,
      },
    ])
  }

  return (
    <div className="space-y-3">
      {tools.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted">
          <GripVertical className="size-6 text-muted-soft" />
          <p className="text-sm">No tools defined</p>
          <p className="max-w-[240px] text-center text-xs text-muted-soft">
            Add function tools that the model can call. Tools will be included in the request body.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((tool, i) => (
            <ToolCard
              key={i}
              tool={tool}
              onChange={(t) => updateTool(i, t)}
              onRemove={() => removeTool(i)}
            />
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full border-hairline text-xs text-muted hover:text-ink"
        onClick={addTool}
      >
        <Plus className="size-3.5" />
        Add Tool
      </Button>
    </div>
  )
}
