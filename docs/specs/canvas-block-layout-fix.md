# Canvas Block 布局修复

## 场景

用户在 Canvas Block 内编辑多条 messages 时，messages 列表超出 400px 高度后出现滚动。此时：
1. "Add message" 和 "Send" 按钮被滚走，需要滚到底才能操作 — 体验差
2. 在 messages 区域内滚动时，wheel 事件冒泡触发 canvas 缩放，内容无法正常滚动

## 功能描述

### 做什么

**底部工具栏固定化：**
- "Add message" + "Send/Stop" 按钮从滚动区域分离
- 放置在 block 底部固定位置，与 messages 滚动区之间有 border 分隔
- 滚动区域仅包含 system prompt + messages 列表

**滚动事件隔离：**
- 当 wheel 事件发生在可滚动元素内部（`overflow-y: auto` 且实际可滚动）时，不触发 canvas zoom
- 只有当滚动区域已到顶/底边界、无法继续滚动时，才允许事件冒泡触发 canvas zoom（可选，MVP 可简单拦截所有）

### 不做什么

- 不改变按钮功能和样式
- 不改变 messages 编辑交互
- 不引入聊天输入框模式

## 验收标准

- [ ] Block 内 messages 滚动时，"Add message" 和 "Send" 按钮始终可见在底部
- [ ] messages 区域内使用滚轮/触摸板滚动不触发 canvas 缩放
- [ ] messages 区域外（canvas 背景）滚轮仍正常触发 zoom
- [ ] Block 折叠状态下无底部栏显示
- [ ] 视觉上底部栏与滚动区域有 hairline border 分隔

## 技术要点

- **涉及文件**：
  - `src/components/canvas/CanvasBlock.tsx` — 布局调整，将 footer 移出 `overflow-y-auto` 容器
  - `src/components/canvas/Canvas.tsx` — `onWheel` handler 增加事件源判断

- **布局改造**（CanvasBlock）：
  ```
  <div> (block container)
    <div> (header)
    <div overflow-y-auto> (scrollable: system prompt + messages only)
    <div> (footer: add message + send buttons, 固定)
  </div>
  ```

- **滚动隔离**（Canvas onWheel）：
  - 检查 `event.target` 是否在含 `overflow-y-auto` 的祖先内
  - 如果是，不执行 zoom 逻辑，不 preventDefault，让浏览器默认滚动生效
  - 简单方案：给 messages 滚动区加 `data-scrollable` 属性，onWheel 中 `target.closest('[data-scrollable]')` 判断

- **风险**：触摸板双指缩放（pinch）走 `onPinch` 不走 `onWheel`，不受影响

## 开放问题

- 无

## 关联

- roadmap: Canvas Messages 基座（属于基座的体验优化）
- 依赖: canvas-messages（已完成）
- 延伸: 无
