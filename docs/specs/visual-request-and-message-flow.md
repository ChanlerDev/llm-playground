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
- If no Request Block is attached, the Provider Float defaults are used.

### Tool Presets

The block offers tool presets so users can explore tool-calling without writing schema:

- Web search: `search(query)`
- Weather: `get_weather(location, unit)`
- Calculator: `calculate(expression)`
- File lookup: `lookup_file(path, query)`

Presets only define tool schemas. They do not execute local tools.

### Message Drag Assembly

- Each message row can be dragged.
- Dropping a message on the canvas moves it into a new Messages Block.
- Dropping a message on another Messages Block appends it there.
- Dropping within the same block without a distinct position is a no-op for this phase.

### Send Feedback

- Clicking Send on a Messages Block creates a temporary Assistant Output Block on the canvas.
- A dashed connection links the source Messages Block to that output block.
- Streamed text updates the output block as it arrives.
- When the request finishes successfully, response messages are appended back to the source Messages Block and the temporary output block is removed.
- On failure or abort, the temporary output block is removed and the error remains in the Response panel.

## Acceptance

- [ ] Request Block is created from the canvas toolbar.
- [ ] Request Block exposes visual controls for core params and tool presets.
- [ ] Messages Block clearly shows its attached request config.
- [ ] Send uses the attached Request Block.
- [ ] Message rows can be moved to canvas or another Messages Block by drag/drop.
- [ ] Send creates a temporary Assistant Output Block with a dashed connection.
- [ ] Streaming content updates the temporary block.
- [ ] Completion appends assistant/tool messages back into the source Messages Block.
- [ ] `bash scripts/check.sh` passes.

## Roadmap Link

- Canvas 画布重构 / Visual Request Config 与消息流
