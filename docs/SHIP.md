# Ship

## Check

`bash scripts/check.sh`

一键验证。内部逻辑：eslint 全量检查 + TypeScript 编译 + Vite 构建。包管理器: pnpm。无测试框架（暂无 test script）。

## Release

`bash scripts/release.sh [patch|minor|major]`

一键发版。脚本内置 pre-flight 守卫 + bump package.json version + changelog 归档 + commit + tag + push。

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
- 只写 `## Unreleased`，release 时自动归档为版本号
- type: feat / fix / chore

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
6. 完成 roadmap 项移到 `## Done`
7. 实现中发现延伸改进追加 roadmap `## Planned`
8. 运行 check 后交付

## Notes

- 部署: Vercel (静态 SPA)
- 无后端，纯前端调用 LLM API
- 设计系统: DESIGN.md (warm-light, hairline depth, one orange accent)
- 协作记录: self/ 目录 (discussions, decisions, design, plans)
- 无 test 框架，build 即验证 TypeScript 正确性
