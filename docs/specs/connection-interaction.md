# 连线交互修复与增强

## 场景

Canvas 上的 block 连线功能当前不可用：drop target `z-[-1]` 永远收不到 pointer events。且缺少视觉反馈——点击连线按钮后无任何提示。需要修复机制并提升交互体验。

## 功能描述

### 做什么

**修复连线创建机制：**
- 移除失效的 `z-[-1]` drop target
- 实现两种触发方式（均可创建连线）：
  1. **拖拽连线**：从 block 边缘连接点(port)拖出 → 拽到目标 block → 松开创建
  2. **按钮触发**：点击 header 的 🔗 按钮 → 画布进入连线模式 → 点击目标 block → 创建

**连接点(Port)：**
- Block 左右两侧各一个连接点（小圆点）
- 默认隐藏，hover block 时显示
- Pointer down 在 port 上 → 开始拖拽连线

**拖拽中视觉反馈：**
- 预览线跟随鼠标（贝塞尔曲线，与最终连线同样式）
- 预览线用虚线 + 流动动画（dash-offset animation）
- 鼠标进入目标 block → 目标 block 边框高亮提示可放置
- 拖到空白松开 → 取消，无操作

**按钮触发模式反馈：**
- 点击 🔗 后画布顶部出现提示条："Click target block to connect · ESC to cancel"
- 光标变 crosshair
- hover 其他 block → 高亮
- 点击目标 block → 创建连线
- ESC / 点空白 → 取消

**已有功能保持：**
- 贝塞尔曲线渲染（已有 ✓）
- 箭头端点（已有 ✓）
- 点击连线编辑 label（已有 ✓）
- 删除连线（已有 ✓）

### 不做什么

- 连线弯折/锚点编辑 — 后续
- 连线动画常态（只在拖拽预览时有动画）— 后续
- 多选连线批量删除 — 后续

## 验收标准

- [ ] Hover block 时左右出现连接点（小圆点）
- [ ] 从连接点拖拽 → 贝塞尔虚线跟随鼠标
- [ ] 拖拽线有 dash 流动动画
- [ ] 拖拽到目标 block 上方 → 目标 block 边框高亮
- [ ] 松开在目标 block → 创建连线
- [ ] 松开在空白区域 → 取消，无残留
- [ ] 点击 🔗 按钮 → 顶部提示条 + cursor 变 crosshair
- [ ] 按钮模式下点击目标 block → 创建连线
- [ ] ESC / 点空白 → 取消按钮模式
- [ ] 创建的连线仍可点击编辑 label、删除
- [ ] 不能连接自身

## 技术要点

- **涉及文件：**
  - `src/components/canvas/CanvasBlock.tsx` — 移除 drop target div，增加 port 渲染 + 拖拽事件
  - `src/components/canvas/Canvas.tsx` — 连线状态管理（dragging/button mode），预览线坐标计算，ESC 监听
  - `src/components/canvas/ConnectionsLayer.tsx` — 新增预览线渲染（虚线 + 动画）

- **状态设计：**
  ```ts
  type ConnectionMode =
    | { type: 'idle' }
    | { type: 'dragging'; fromBlockId: string; cursorPos: Position }
    | { type: 'button'; fromBlockId: string }
  ```

- **Port 位置计算：**
  - 左 port: `{ x: block.position.x, y: block.position.y + headerHeight/2 }`
  - 右 port: `{ x: block.position.x + BLOCK_WIDTH, y: block.position.y + headerHeight/2 }`
  - 连线起点自动选择离目标更近的 port

- **预览线动画 CSS：**
  ```css
  @keyframes dash-flow {
    to { stroke-dashoffset: -20; }
  }
  .connection-preview {
    stroke-dasharray: 8 4;
    animation: dash-flow 0.5s linear infinite;
  }
  ```

- **拖拽实现：** 复用 `onPointerDown/Move/Up` + `setPointerCapture`，在 Canvas 级别追踪 `cursorPos`，实时更新预览线终点

- **目标检测：** 拖拽中 pointer move 时检查鼠标是否在某 block 范围内（rect hit test），是则设 `hoverTargetBlockId`

## 开放问题

- 无

## 关联

- roadmap: Canvas 画布重构子项
- 依赖: canvas-messages（已完成）
- 延伸: 连线锚点编辑、连线常态动画
