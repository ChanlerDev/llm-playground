# Message 选中与编辑分离

## 场景

用户在 Canvas Block 中操作 messages 时，当前点击即进入 textarea 编辑态。缺少"选中"中间态——用户无法在不进入编辑的情况下对 message 执行复制、删除等操作。需要单击选中（高亮 + 操作按钮）、双击编辑的两层交互。

## 功能描述

### 做什么

**选中态（单击）：**
- 单击 message → 进入选中态
- 视觉：高亮边框/背景色区分
- 显示操作按钮行：编辑(✎)、复制(📋)、删除(⊘)
- 再点其他 message → 切换选中
- 点击 message 外区域 → 取消选中

**编辑态（双击）：**
- 双击 message 内容 → 进入 textarea 编辑（现有行为）
- 或在选中态点击"编辑"按钮 → 进入 textarea
- blur → 退出编辑态，回到普通态（非选中）

**操作按钮功能：**
- 编辑：进入 textarea 编辑态
- 复制：复制 message content 到剪贴板
- 删除：删除该 message（现有逻辑）

### 不做什么

- 多选（Shift/Cmd 多选 messages）— 后续
- 拖拽排序 messages — 后续
- 右键上下文菜单 — 后续

## 验收标准

- [ ] 单击 message → 高亮选中态，显示操作按钮
- [ ] 双击 message → 直接进入 textarea 编辑
- [ ] 选中态点"编辑"按钮 → 进入 textarea
- [ ] 选中态点"复制"→ message content 进剪贴板
- [ ] 选中态点"删除"→ 删除该 message
- [ ] 点击 block 内其他区域 → 取消选中
- [ ] 编辑态 blur → 退出编辑，回普通态
- [ ] 选中态视觉区分明显（高亮背景/边框）

## 技术要点

- **涉及文件**：`src/components/canvas/CanvasBlock.tsx`
- **状态变化**：
  - 现有 `editingMessageIdx: number | null` 保留
  - 新增 `selectedMessageIdx: number | null`
  - 单击 → set selectedMessageIdx
  - 双击 → set editingMessageIdx
- **交互改造**：
  - 现有 message content div `onClick` → 改为 `onClick` 选中 + `onDoubleClick` 编辑
  - 需防 single click 和 double click 冲突（双击时不应先触发选中再编辑，用 click delay 或 onDoubleClick 阻止）
- **操作按钮**：选中态时渲染在 message header 右侧（替代现有 hover 显示的删除按钮）
- **复制功能**：`navigator.clipboard.writeText(msg.content)`

## 开放问题

- 无

## 关联

- roadmap: Canvas 画布重构子项
- 依赖: canvas-messages（已完成）
- 延伸: 多选 + 批量操作、拖拽排序
