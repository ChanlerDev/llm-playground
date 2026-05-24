# Ship

## Check

`bash scripts/check.sh`

一键验证。内部逻辑：eslint 全量检查 + TypeScript 编译 + Vite 构建。包管理器: pnpm。无测试框架（暂无 test script）。

## Checkpoint (Release)

`bash scripts/release.sh [patch|minor|major]`

本地 checkpoint 脚本，在你认为"这批改动值得标记"时手动调用。

**做什么：**
1. Pre-flight 守卫（tree clean / changelog 非空 / check 通过）
2. Bump package.json version (patch+1)
3. Changelog: `## Unreleased` 归档为 `## X.Y.Z (date)`
4. Roadmap: `[x]` 项从 Planned 移到 Done
5. Commit + tag `vX.Y.Z` + push

**不做什么：** 不触发部署（Vercel 监听 main push 自动部署）。

**何时调用：** 一批功能做完、觉得状态不错时。不必每次 push 都跑。

## Conventions

### Commit
- Conventional Commits (英文)
- 一行 title, ≤72 字符
- 按业务含义拆分 commit
- 实现、文档、release 元数据不混在一起

### Branch
- `feat/xxx`, `fix/xxx` from main
- 合并后删除分支

### Changelog
- 格式: `- **type**: description`
- 只写 `## Unreleased`，checkpoint 时自动归档为版本号
- type: feat / fix / chore
- 开发中随时写（/ship 流程自动写）

### Roadmap
- 大功能拆子项，子项各关联 spec
- 开发中子项完成标 `[x]`，父项保持 `[ ]`
- 父项所有子项全部 `[x]` → checkpoint 时整棵树搬到 Done
- 无子项的顶级 `[x]` → checkpoint 时直接搬到 Done
- Planned 区域 = 活跃进度面板（能看到大项完成了多少）

### 文档同步
- 用户可见行为变化 → changelog
- 产品语义或契约变化 → DESIGN.md
- 安装和使用方式变化 → README

## Dev Loop

1. 判断需求是否有用户价值；不可行时说明原因给替代方案
2. 新功能先加 roadmap `## Planned`；bugfix 不必
3. 从 main 开分支 `feat/xxx` 或 `fix/xxx`
4. 实现保持聚焦，遵循现有结构和风格
5. 用户可见变化写 changelog `## Unreleased`
6. 完成 roadmap 项标记 `[x]`（checkpoint 时自动搬到 Done）
7. 实现中发现延伸改进追加 roadmap `## Planned`
8. 运行 check 后交付
9. 一批做完 → `bash scripts/release.sh` checkpoint

## Deploy

- **触发**: push to main → Vercel 自动构建部署
- **无需手动操作**: 合并到 main 即上线
- **checkpoint 与部署无关**: version tag 仅作时间线标记

## Notes

- 部署: Vercel (静态 SPA), push main = prod
- 无后端，纯前端调用 LLM API
- 设计系统: DESIGN.md (warm-light, hairline depth, one orange accent)
- 协作记录: self/ 目录 (discussions, decisions, design, plans)
- 无 test 框架，build 即验证 TypeScript 正确性
