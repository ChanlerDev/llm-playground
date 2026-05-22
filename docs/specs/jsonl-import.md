# JSONL Import — 对话日志导入可视化

## 场景

开发者使用 Claude Code 或 Codex 进行编码时，产生的对话日志（JSONL）是黑盒：很长、嵌套深、难以直观理解 context 结构。需要一个可视化方式将 JSONL 导入画布，直观呈现整个对话的 messages 结构，帮助理解 agent 的 context 管理策略。

## 功能描述

### 做什么

**导入入口：**
- 画布上的 Import 按钮 / 拖拽文件到画布
- 支持 `.jsonl` 文件

**格式识别与解析：**
- 自动识别 Claude Code JSONL 格式（`~/.claude/projects/*/conversations/*.jsonl`）
- 自动识别 Codex JSONL 格式
- 解析为统一的内部 messages 结构

**画布展示：**
- 导入后在画布上生成一个 Messages Block
- Block 标题为文件名（可重命名）
- 长对话的 messages 在 block 内垂直排列，支持折叠
- 每条 message 显示 role、content 摘要、tool_use/tool_result 标记
- 大型对话（几百条 message）需要虚拟滚动或分段折叠，避免卡顿

**Claude Code JSONL 特殊处理：**
- 识别 thinking block、tool_use/tool_result 对
- 工具调用对可折叠为一行摘要（如 "Read: src/app.tsx"）
- 保留原始数据，展开可看完整内容

**Codex JSONL 特殊处理：**
- 识别 Codex 特有的 metadata 和 function_call 格式
- 适配 OpenAI function calling 结构

### 不做什么

- 不支持编辑导入后的 messages（只读展示）— 后续可开放
- 不支持导出为 JSONL — 后续
- 不实时监听文件变化 — 一次性导入

## 验收标准

- [ ] 可通过按钮或拖拽导入 .jsonl 文件
- [ ] 自动识别 Claude Code 和 Codex 两种 JSONL 格式
- [ ] 导入后在画布生成 Messages Block，正确展示所有 messages
- [ ] 每条 message 显示 role 标识和内容（长内容截断 + 展开）
- [ ] tool_use/tool_result 对可折叠为摘要行
- [ ] 导入 500+ messages 的大文件不卡顿（虚拟滚动或分段折叠）
- [ ] 格式识别错误时给出明确错误提示

## 技术要点

- **解析器架构**：策略模式，ClaudeCodeParser + CodexParser，统一输出 `ParsedConversation` 类型
- **Claude Code JSONL 结构**：每行是一个 JSON object，包含 `type`、`message`、`timestamp` 等字段
- **Codex JSONL 结构**：需要实际采样确认格式（可能每行是一个 message object 或 event）
- **大文件处理**：FileReader + streaming parse（逐行），不一次性 load 全文件到内存
- **虚拟滚动**：block 内 messages 多时用虚拟列表（可用 react-window 或自建简易版）
- **涉及文件**：新建 `src/services/parsers/`、`src/components/ImportButton.tsx`

## 开放问题

- Codex JSONL 具体格式需要实际采样确认 — 需要用户提供样本文件
- 导入后的 block 是否允许编辑（变为可写）？— 建议 MVP 只读，后续开放

## 关联

- roadmap: JSONL Import 对话可视化
- 依赖: canvas-messages（需要画布基座和 Block 组件）
- 延伸: 导出为 JSONL、实时文件监听
