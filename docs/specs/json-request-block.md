# JSON Request Block

## Scene

Canvas currently models messages well, but request configuration remains global. This makes it hard to compare the same message set with different tools, sampling values, stop sequences, or other provider request fields.

JSON Request Block turns non-message request configuration into an attachable canvas node. A user can keep messages in a Messages Block, write request JSON in a separate block, connect the two, and send the chat with that request patch applied.

## Behavior

### What It Does

- Add a new canvas block type: JSON Request Block.
- The block contains a scrollable code editor area for JSON.
- The JSON represents request fields other than `messages`.
- A JSON Request Block can attach to a Messages Block through an existing canvas connection.
- Sending a Messages Block applies the attached JSON to that request.
- The generated request preview and actual API request both use the attached JSON.
- Existing Provider Float remains the source of provider, base URL, API key, and default request values.

### Supported JSON Shape

The JSON must be an object. Known normalized fields:

```json
{
  "temperature": 0.2,
  "maxTokens": 2048,
  "topP": 1,
  "stream": true,
  "stop": ["END"],
  "tools": [
    {
      "name": "search",
      "description": "Search the web",
      "enabled": true,
      "parameters": [
        {
          "name": "query",
          "type": "string",
          "description": "Search query",
          "required": true
        }
      ]
    }
  ]
}
```

Additional provider request fields may be passed through as raw body overrides as long as they do not try to replace `messages`. This includes provider-specific fields such as `model`, `tool_choice`, or `metadata`.

### Guardrails

- `messages` is forbidden in JSON Request Blocks. Messages remain owned by Messages Blocks.
- Provider credentials and endpoint routing are not moved into JSON Request Blocks in this phase.
- Invalid JSON blocks sending and shows the parse error in the block.
- More than one JSON Request Block attached to the same Messages Block blocks sending until the user disconnects the extra request blocks.
- A JSON Request Block that is not connected to a Messages Block has no effect.

### Out Of Scope

- Executing local tools.
- Full JSON Schema editing UI for tools.
- Multiple request-block merge strategies.
- Moving provider credentials or endpoint routing into canvas nodes.

## Acceptance

- [ ] User can create a JSON Request Block from the canvas.
- [ ] JSON Request Block can be moved, collapsed, duplicated, deleted, and connected like existing blocks.
- [ ] The JSON editor is scrollable and does not trigger canvas zoom while scrolling.
- [ ] Sending a connected Messages Block applies normalized params and tools.
- [ ] JSON cannot override `messages`.
- [ ] Invalid JSON or multiple attached request blocks shows a clear error and prevents send.
- [ ] Existing messages-only send flow continues to work without a JSON Request Block.
- [ ] `bash scripts/check.sh` passes.

## Implementation Notes

- Convert canvas block state to a discriminated union:
  - `kind: "messages"`
  - `kind: "request-json"`
- Keep backwards compatibility by normalizing legacy blocks without `kind` as Messages Blocks when loading localStorage.
- Resolve request attachment from graph connections. A request block is attached when either endpoint is the Messages Block and the other endpoint is a JSON Request Block.
- Build final request inputs by merging default Provider Float params with normalized JSON params, then passing tools and raw body overrides into provider builders.
- Provider builders should apply raw body overrides after normalized params, but must never allow `messages` to be replaced.

## Roadmap Link

- Canvas 画布重构 / JSON Request Block
