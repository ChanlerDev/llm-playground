# Visual Request Config And Message Flow

## Problem

JSON Request Block proves the data model, but it is too hard for normal use. Request parameters and tool definitions should be visible, selectable, and attached to the messages they affect. Sending should also make the response lifecycle visible on the canvas instead of silently appending an assistant message.

## Product Contract

### Request Block

- Replace JSON-first configuration with a visual Request Block.
- The block configures request values except `messages`:
  - model override
  - temperature
  - max output tokens
  - top P
  - stream on/off
  - stop sequences
  - tool definitions
- Keep an optional Advanced JSON patch area for provider-specific fields.
- The Request Block attaches to a Messages Block through a canvas connection.
- A connected Messages Block shows which Request Block will be used when sent.
- Provider Float remains responsible for provider connection settings. Request Block is the primary surface for model, params, tools, and request-specific options.
- If no Request Block is attached, provider defaults are still used as a fallback.

### Tool Presets

The block offers tool presets so users can explore tool-calling without writing schema:

- Web search: `search(query)`
- Weather: `get_weather(location, unit)`
- Calculator: `calculate(expression)`
- File lookup: `lookup_file(path, query)`

Presets only define tool schemas. They do not execute local tools.

Users can also add custom tools directly in the Request Block. Custom and preset tools share the same editor:

- tool name
- tool description
- enabled/disabled state
- parameter name
- parameter type
- required flag
- parameter description

### Message Drag Assembly

- Each message row can be dragged.
- Dropping a message on the canvas moves it into a compact single-message block.
- Dropping a message on another Messages Block appends it there.
- Dragging a compact single-message block back onto a Messages Block appends it there and removes the compact block.
- Compact single-message blocks do not expose Messages Block actions such as Add message or Send.
- Dropping within the same block without a distinct position is a no-op for this phase.

### Send Feedback

- Clicking Send on a Messages Block creates a temporary Assistant Output Block on the canvas.
- A dashed connection links the source Messages Block to that output block.
- Streamed text updates the output block as it arrives.
- When the request finishes successfully, response messages are appended back to the source Messages Block and the temporary output block is removed.
- On failure or abort, the temporary output block is removed and the error remains in the Response panel.

## Acceptance

- [ ] Request Block is created from the canvas toolbar.
- [ ] Request Block exposes visual controls for core params, tool presets, and custom tools.
- [ ] Messages Block clearly shows its attached request config.
- [ ] Send uses the attached Request Block.
- [ ] Message rows can be moved to compact canvas blocks or another Messages Block by drag/drop.
- [ ] Compact single-message blocks can be deleted or dragged back into a Messages Block.
- [ ] Provider Float keeps provider connection settings out of request-level controls.
- [ ] Send creates a temporary Assistant Output Block with a dashed connection.
- [ ] Streaming content updates the temporary block.
- [ ] Completion appends assistant/tool messages back into the source Messages Block.
- [ ] `bash scripts/check.sh` passes.

## Roadmap Link

- Canvas 画布重构 / Visual Request Config 与消息流
