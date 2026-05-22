# Canvas Compact — LLM 驱动的上下文压缩

## 场景

开发者想理解或模拟 autocompact 的效果：一组长 messages 经过压缩后变成什么样？token 省了多少？压缩质量如何？Canvas Compact 让用户选中一个 Messages Block，一键调用 LLM 生成压缩版，产出新的 Block 并可视化对比。

## 功能描述

### 做什么

**Compact 操作：**
- 选中一个 Messages Block → 右键菜单或工具栏出现 "Compact" 按钮
- 点击后调用 LLM API，发送 summarization prompt + 原始 messages
- LLM 返回压缩后的 messages 内容
- 自动在画布上创建新的 Messages Block（标题加 " (compacted)" 后缀）
- 自动在原始 block 和压缩 block 之间画一条带 "compact" 标注的箭头

**压缩配置：**
- 默认使用当前 Provider 配置的 model
- 可选：压缩强度（保留最近 N 条不压缩）
- 可选：自定义 summarization prompt（高级用户）

**对比展示：**
- 两个 block 并排，箭头连接
- 原始 block 显示原始 token 数估算
- 压缩 block 显示压缩后 token 数估算
- 箭头标注上可显示压缩比（如 "72% → 28%"）

### 不做什么

- 不支持增量 compact（只处理部分 messages）— 后续
- 不支持多轮自动 compact（一次只做一次）— 后续
- 不支持自定义压缩算法（只用 LLM summarization）— 后续
- 本地规则式压缩（如删除 tool_result）— 后续可加为预处理步骤

## 验收标准

- [ ] 选中 block 后出现 Compact 按钮
- [ ] 点击 Compact 调用当前配置的 LLM API 进行压缩
- [ ] 压缩完成后自动创建新 block + 箭头连线
- [ ] 新 block 内容为 LLM 返回的压缩版 messages
- [ ] 显示 token 数估算对比（原始 vs 压缩）
- [ ] 压缩过程中有 loading 状态，失败有错误提示
- [ ] 可配置压缩强度（保留最近 N 条不压缩）

## 技术要点

- **Summarization Prompt**：需要精心设计 system prompt，指导 LLM 如何压缩对话历史
- **Token 估算**：前端用 tiktoken-lite 或简单字符比例估算（不需要精确）
- **API 调用**：复用现有 `services/` 的 provider 逻辑，构造 compact 请求
- **Prompt 设计参考**：可参考 Claude Code autocompact 的 prompt 策略（summarize conversation preserving key context）
- **涉及文件**：新建 `src/services/compact.ts`、`src/components/CompactButton.tsx`

## 开放问题

- Summarization prompt 的最佳实践？— 需要迭代调优
- 压缩后是否保持原始 messages 格式（role/content 结构）还是变为单条 summary？— 建议保持 messages 结构，更好对比

## 关联

- roadmap: Canvas Compact LLM 压缩
- 依赖: canvas-messages（需要画布基座、Block 组件、Provider 配置）
- 延伸: 增量 compact、本地规则预处理、自动多轮 compact
