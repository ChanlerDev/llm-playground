# Reasoning Content — Thinking 内容支持

## 场景

开发者使用 Anthropic extended thinking 或 OpenAI o-series reasoning 功能时，需要查看模型的推理过程。当前 canvas 只展示最终 content，丢失了 thinking/reasoning 信息。需要在请求参数中开启 thinking，在 block 展示中可视化 reasoning 过程。

## 功能描述

### 做什么

**请求参数配置：**
- Provider Float 增加 Thinking 开关
- Anthropic: 开启时发送 `thinking: { type: "enabled", budget_tokens: N }` 参数
- OpenAI: 开启时发送 `reasoning_effort: "low" | "medium" | "high"` 参数
- budget_tokens 可配置（默认 10240），reasoning_effort 可选档位

**请求构建：**
- `buildAnthropicRequest`: 当 thinking 启用时，body 增加 `thinking` 字段，且 `temperature` 必须为 1（Anthropic 要求）
- `buildOpenAIRequest`: 当 reasoning 启用时，body 增加 `reasoning_effort` 字段

**Response 解析（非流式）：**
- Anthropic: 识别 `content` 数组中 `type: "thinking"` 的 block，提取 `thinking` 文本
- OpenAI: 识别 response 中的 reasoning 字段（如有暴露）

**Response 解析（流式）：**
- Anthropic SSE: 处理 `content_block_start` (type=thinking) → `content_block_delta` (type=thinking_delta) → `content_block_stop` 事件序列
- 累积 thinking 文本，完成后作为 thinking content 传出

**Message 类型扩展：**
- `Message` 增加可选 `thinking?: string` 字段
- Auto-append 时将 thinking content 存入 message.thinking

**CanvasBlock 展示：**
- Assistant message 有 thinking 时，在 content 上方显示折叠式 thinking 区域
- 视觉：使用 `timeline-thinking` 色（暖橙），虚线左边框，默认折叠
- 折叠态显示 "Thinking..." + 字符数
- 展开态显示完整 thinking 文本（等宽字体）

**Response Panel 展示：**
- assembledContent 前面增加 thinking 部分（如有）
- 或者在 Content tab 中用折叠块展示 thinking

### 不做什么

- 不支持 thinking 内容编辑（只读展示）
- 不支持手动添加 thinking message（只从 response 获取）
- 不做 streaming thinking 实时渲染（等完整块再展示）— 后续可做
- 不做 redacted thinking 处理（直接展示 "[redacted]" 文本）

## 验收标准

- [ ] Provider Float 中有 Thinking 开关，Anthropic 时显示 budget_tokens 输入，OpenAI 时显示 reasoning_effort 选择
- [ ] 开启 Thinking 后，Anthropic 请求包含正确的 `thinking` 参数，temperature 强制为 1
- [ ] 开启 Reasoning 后，OpenAI 请求包含 `reasoning_effort` 参数
- [ ] 非流式 Anthropic response 正确提取 thinking content
- [ ] 流式 Anthropic response 正确累积 thinking_delta 事件
- [ ] Auto-append 到 block 时，assistant message 携带 `thinking` 字段
- [ ] CanvasBlock 中 assistant message 有 thinking 时显示可折叠的 thinking 区域
- [ ] thinking 区域使用 timeline-thinking 色，默认折叠，展开显示完整内容
- [ ] 无 thinking 的 response 不受影响（向后兼容）

## 技术要点

- **涉及文件：**
  - `src/types/provider.ts` — Message 增加 thinking 字段，RequestParams 增加 thinking 配置
  - `src/services/anthropic-provider.ts` — buildAnthropicRequest 增加 thinking 参数
  - `src/services/openai-provider.ts` — buildOpenAIRequest 增加 reasoning_effort
  - `src/services/stream-parser.ts` — 处理 thinking 类型的 SSE 事件
  - `src/hooks/useApiRequest.ts` — 传递 thinking 内容到 getResponseMessages
  - `src/components/canvas/CanvasBlock.tsx` — 展示 thinking 折叠区域
  - `src/components/canvas/ProviderFloat.tsx` — 增加 Thinking 配置 UI
- **Anthropic thinking API 格式：**
  - 请求: `{ thinking: { type: "enabled", budget_tokens: 10240 } }`
  - 响应: content 数组含 `{ type: "thinking", thinking: "..." }`
  - 流式: `content_block_start` + `content_block_delta` (type=thinking_delta, thinking="...")
- **OpenAI reasoning API 格式：**
  - 请求: `{ reasoning_effort: "medium" }`
  - 响应: reasoning_tokens 在 usage 中，reasoning content 部分 provider 暴露在 message 中
- **约束：** Anthropic extended thinking 要求 temperature=1，streaming 时必须 stream=true

## 开放问题

- OpenAI reasoning content 是否实际可见取决于 provider（官方 API 不暴露 reasoning 文本，只有 token 数）— 先支持参数发送，展示有则展示
- Streaming thinking 实时渲染（字符逐步出现）— 后续迭代

## 关联

- roadmap: Reasoning Content 支持
- 依赖: canvas-messages（已完成）
- 延伸: streaming thinking 实时展示、thinking token 统计
