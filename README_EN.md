# LLM Playground

[中文](./README.md)

A browser-based tool for testing LLM APIs. Supports OpenAI and Anthropic, with real-time streaming, tool calling, and request/response inspection.

## Features

- **Multi-provider** — Switch between OpenAI and Anthropic with one click
- **Streaming** — Watch responses come in token by token, with SSE chunk viewer and timing stats
- **Tool Calling** — Define function tools with JSON Schema, test tool_calls / tool_use flows
- **Request Preview** — See the exact JSON body before it's sent, edit it on the fly
- **Stats** — TTFB, total duration, token counts, tokens/sec
- **Dark mode**, localStorage persistence, keyboard shortcuts (`Ctrl+Enter` to send, `Esc` to abort)

## Quick Start

```bash
git clone git@github.com:ChanlerDev/llm-playground.git
cd llm-playground
npm install
npm run dev
```

Open `http://localhost:5173`, enter your API key, and start testing.

## Tech Stack

React + TypeScript + Vite + Tailwind CSS + shadcn/ui

## License

MIT
