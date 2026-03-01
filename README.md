# LLM Playground

[English](./README_EN.md)

一个浏览器端的 LLM API 调试工具。支持 OpenAI 和 Anthropic，可实时查看流式响应、测试 Tool Calling、检查请求和响应细节。

## 功能

- **多 Provider 切换** — 一键切换 OpenAI / Anthropic
- **流式响应** — 逐 token 展示，附带 SSE chunk 查看器和耗时统计
- **Tool Calling** — 通过 JSON Schema 定义 function tools，测试 tool_calls / tool_use 流程
- **请求预览** — 发送前查看完整的 JSON 请求体，支持手动编辑
- **统计面板** — TTFB、总耗时、token 用量、tokens/sec
- **暗色模式**，配置自动持久化到 localStorage，快捷键（`Ctrl+Enter` 发送，`Esc` 中止）

## 快速开始

```bash
git clone git@github.com:ChanlerDev/llm-playground.git
cd llm-playground
npm install
npm run dev
```

打开 `http://localhost:5173`，填入 API Key 即可使用。

## 技术栈

React + TypeScript + Vite + Tailwind CSS + shadcn/ui

## License

MIT
