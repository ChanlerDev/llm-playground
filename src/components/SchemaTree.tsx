import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { ProviderType, SchemaField } from '@/types/provider'
import { openaiRequestSchema, openaiResponseSchema } from '@/data/openai-schema'
import { anthropicRequestSchema, anthropicResponseSchema } from '@/data/anthropic-schema'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

interface SchemaTreeProps {
  provider: ProviderType
}

export function SchemaTree({ provider }: SchemaTreeProps) {
  const requestSchema = provider === 'openai' ? openaiRequestSchema : anthropicRequestSchema
  const responseSchema = provider === 'openai' ? openaiResponseSchema : anthropicResponseSchema

  return (
    <Tabs defaultValue="request" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="request" className="flex-1">
          Request Schema
        </TabsTrigger>
        <TabsTrigger value="response" className="flex-1">
          Response Schema
        </TabsTrigger>
      </TabsList>
      <TabsContent value="request">
        <div className="mt-2 space-y-0.5">
          {requestSchema.map((field) => (
            <SchemaFieldRow key={field.name} field={field} depth={0} defaultExpandDepth={1} />
          ))}
        </div>
      </TabsContent>
      <TabsContent value="response">
        <div className="mt-2 space-y-0.5">
          {responseSchema.map((field) => (
            <SchemaFieldRow key={field.name} field={field} depth={0} defaultExpandDepth={1} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}

interface SchemaFieldRowProps {
  field: SchemaField
  depth: number
  defaultExpandDepth: number
}

function SchemaFieldRow({ field, depth, defaultExpandDepth }: SchemaFieldRowProps) {
  const hasChildren = field.children && field.children.length > 0
  const [isOpen, setIsOpen] = useState(depth < defaultExpandDepth)

  if (!hasChildren) {
    return (
      <div className="flex flex-col gap-0.5 rounded px-2 py-1.5 hover:bg-canvas-soft">
        <div className="flex items-center gap-2">
          {/* Spacer to align with collapsible items */}
          <span className="inline-block w-4" />
          <span className="font-mono font-semibold text-sm text-ink">{field.name}</span>
          {field.required && <span className="text-semantic-error text-xs font-bold">*</span>}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {field.type}
          </Badge>
          {field.default !== undefined && (
            <span className="text-xs text-muted">= {field.default}</span>
          )}
        </div>
        <div className="ml-6 text-xs text-muted leading-relaxed">{field.description}</div>
        {field.providerNote && (
          <div className="ml-6 text-[10px] text-amber-600">{field.providerNote}</div>
        )}
      </div>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded px-2 py-1.5 hover:bg-canvas-soft">
        <CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
          {isOpen ? (
            <ChevronDown className="size-4 shrink-0 text-muted" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted" />
          )}
          <span className="font-mono font-semibold text-sm text-ink">{field.name}</span>
          {field.required && <span className="text-semantic-error text-xs font-bold">*</span>}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {field.type}
          </Badge>
          {field.default !== undefined && (
            <span className="text-xs text-muted">= {field.default}</span>
          )}
        </CollapsibleTrigger>
        <div className="ml-6 mt-0.5 text-xs text-muted leading-relaxed">{field.description}</div>
        {field.providerNote && (
          <div className="ml-6 text-[10px] text-amber-600">{field.providerNote}</div>
        )}
      </div>

      <CollapsibleContent>
        <div className="ml-4 border-l border-hairline pl-2">
          {field.children!.map((child) => (
            <SchemaFieldRow
              key={child.name}
              field={child}
              depth={depth + 1}
              defaultExpandDepth={defaultExpandDepth}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
