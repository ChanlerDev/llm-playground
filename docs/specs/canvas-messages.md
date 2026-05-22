# Canvas Messages — 画布基座

## 场景

开发者在调试 LLM API 时，需要同时对比多组 messages 的变化（如添加 system prompt 前后、不同 few-shot 组合）。当前单组 messages 编辑器无法满足"构造 → 对比 → 运行"的核心工作流。

Canvas 提供自由画布，让用户在一个平面上放置、编辑、对比多个 Messages Block，并选择其中一个执行 API 调用。

## 功能描述

### 做什么

**Canvas 交互层：**
- 无限画布，支持 pan（拖拽平移）和 zoom（滚轮/捏合缩放）
- 画布背景为 dot grid（点阵辅助定位）
- 画布上可放置 Messages Block 节点
- Block 之间可画箭头/连线，标注关系（如 "compact"、"添加 tool"）
- 连线可附带文字标注
- 画布状态持久化到 localStorage

**Messages Block：**
- 画布上的可拖拽卡片，是核心节点类型
- 标题栏：可重命名、显示 message 数量 badge、Active 状态标记
- 内部展示 messages 列表，每条 message 按 role 区分（彩色左边框）
- 单条 message：可折叠/展开/编辑内容/删除/拖拽排序
- 整个 block 可折叠为仅标题（节省画布空间）
- 操作：新建 block、复制 block、重命名、删除
- 选中某 block 设为 "Active"（Send 时用它）

**Provider 配置浮窗：**
- 隐藏式，点击按钮弹出浮窗面板
- 内容：Provider 切换（OpenAI/Anthropic）、Base URL、API Key、Model 选择、参数（temperature/topP/maxTokens）、Stream 开关
- 浮窗关闭后配置持久化
- 画布上有 Send 按钮，显示当前 active block 名称

**Response 面板：**
- 右侧可收起面板（默认 360px），可调宽度
- 保留现有功能：流式响应、JSON 查看、Raw SSE、Content
- "Add to Messages" 将 response 追加到 active block

### 不做什么（MVP 排除）

- 画简单形状（矩形、椭圆）标注 — 后续
- 文字注释节点 — 后续
- 多画布文档切换 — 后续
- 导出画布为图片 — 后续
- Undo/Redo — 后续
- 协作/分享 — 后续
- Tools 定义和执行 — 后续

## 验收标准

- [ ] 画布可 pan（鼠标拖拽/触摸板双指）和 zoom（滚轮/捏合），有 dot grid 背景
- [ ] 可创建新 Messages Block，拖拽定位到画布任意位置
- [ ] Block 内可增删改 message（role + content），支持 user/assistant/system/tool 角色
- [ ] 可选中某 block 设为 Active，视觉上有明确标记
- [ ] 点击 Send 使用 active block 的 messages 调用 LLM API，结果显示在 Response 面板
- [ ] Block 之间可画箭头连线，连线可附带文字标注
- [ ] Provider 配置通过浮窗操作，不占用画布常驻空间
- [ ] 画布状态（block 位置、内容、连线）持久化到 localStorage
- [ ] 整体视觉遵循 DESIGN.md 设计系统（warm-light、hairline borders、orange accent）

## 技术要点

- **Canvas 实现**：HTML transforms（CSS translate/scale）+ `@use-gesture/react`（~8KB），block 内有 rich HTML 不适合用纯 canvas
- **连线**：SVG overlay 层，箭头端点跟随 block 位置更新
- **状态管理**：自定义 hooks + localStorage 持久化
- **复用现有**：`services/` 下 provider/streaming 逻辑不动，Config 表单控件搬到浮窗
- **布局变化**：从三栏布局变为 Canvas + 右侧 Response 面板（可收起）
- **涉及模块**：几乎所有 `src/components/` 需要重构，但 `src/services/` 和 `src/hooks/` 中 API 调用逻辑可复用

## 开放问题

- Block 内 message 编辑是纯 textarea 还是需要 JSON 编辑器（for tool_call content）？— 建议 MVP 用 textarea，tool_call 场景后续增强
- 移动端适配优先级？— 建议 MVP 不考虑，桌面优先

## 关联

- roadmap: Canvas Messages 基座
- 依赖: 无（基座，其他 spec 依赖它）
- 延伸: jsonl-import, canvas-compact
