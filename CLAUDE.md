# CLAUDE.md — Agent Desktop Codebase Guide

This file provides AI assistants with a comprehensive overview of the Agent Desktop project: its architecture, conventions, workflows, and key implementation details.

---

## Project Overview

**Agent Desktop** is an Electron-based desktop application that provides a local AI agent interface powered by the Anthropic Claude API. Users interact with a chat UI to run agentic tasks that can read/write files, execute shell commands, and explore the local filesystem — all constrained to a configurable workspace directory.

- **Primary language:** TypeScript (frontend) + JavaScript (Electron backend)
- **Framework:** Electron 33 + React 18 + Vite 6
- **AI SDK:** `@anthropic-ai/sdk`
- **Package manager:** pnpm (v9.6+)

---

## Repository Structure

```
agent-desktop/
├── electron/                    # Electron main process & agent backend
│   ├── main.js                  # Window creation, IPC handlers
│   ├── preload.js               # Security bridge (context isolation)
│   └── agent/
│       ├── loop.js              # Agentic loop (Claude API integration)
│       └── tools/
│           └── index.js         # 8 built-in tool definitions & executor
├── src/                         # React frontend (renderer process)
│   ├── main.tsx                 # App entry point
│   ├── index.html               # HTML shell with global CSS/fonts
│   ├── App.tsx                  # Root component: routing + global state
│   ├── types.ts                 # Shared TypeScript type definitions
│   ├── electron-mock.ts         # Browser-side mock for Electron API
│   └── components/
│       ├── Sidebar.tsx          # Left nav: conversation list, user menu
│       ├── HomePage.tsx         # Landing: input, quick chips, expert cards
│       ├── ChatPage.tsx         # Chat UI: messages, tool viz, streaming
│       └── SettingsModal.tsx    # Multi-tab settings overlay
├── scripts/
│   └── dev-runner.js            # Dev launcher (port cleanup, orchestration)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── pnpm-workspace.yaml
├── README.md                    # Chinese-language user documentation
├── DEV_INFO.md                  # Development setup notes
└── DEV_NOTES.md                 # Completion notes
```

---

## Architecture

The app follows a three-layer architecture with strict Electron security practices:

### Layer 1 — Renderer Process (React)

React components in `src/` render the UI. They communicate with the main process exclusively through `window.electron` (exposed by the preload script). No direct Node.js or Electron APIs are accessible here.

**Component hierarchy:**
```
App
├── Sidebar              — conversation list, settings trigger, user profile
├── HomePage             — hero input, quick action chips, expert cards
├── ChatPage             — message stream, tool execution blocks, status
└── SettingsModal        — overlays on top, 7 tab sections
```

### Layer 2 — Preload Bridge (`electron/preload.js`)

Exposes a safe, typed `window.electron` API to the renderer using `contextBridge`. Context isolation is **enabled**; `nodeIntegration` is **disabled**. All IPC goes through this bridge.

### Layer 3 — Main Process (`electron/main.js` + `electron/agent/`)

Handles OS-level operations, Claude API calls, and settings persistence via `electron-store`.

**IPC channels (invoke):**

| Channel | Purpose |
|---|---|
| `get-settings` | Returns stored settings object |
| `save-settings` | Persists settings to electron-store |
| `pick-folder` | Opens native folder picker dialog |
| `agent-run` | Starts the agent loop |
| `agent-stop` | Signals agent to stop |
| `fs-list` | Lists directory contents |
| `open-in-explorer` | Opens path in native file explorer |

**IPC events (one-way, main → renderer):**
- `agent-event` — streams agent step events (start, text, tool_start, tool_result, done, error, stopped)

---

## Agent Execution Flow

```
User input → ChatPage → ipc.invoke("agent-run") → loop.js
  → Anthropic SDK (messages API, streaming)
  → Claude response with tool_use blocks
  → tools/index.js (ToolExecutor.execute)
  → File/shell operation in workspace
  → tool_result fed back to Claude
  → Loop repeats until done / max steps
  → ipc.emit("agent-event") at each step
  → ChatPage updates UI reactively
```

**Agent loop (`electron/agent/loop.js`) key parameters:**
- `max_tokens`: 8096
- `maxSteps`: configurable (5–100, default 20)
- System prompt: emphasizes local file/shell assistant capabilities
- Events: `start`, `step`, `text`, `tool_start`, `tool_result`, `done`, `error`, `stopped`

---

## Built-in Agent Tools (`electron/agent/tools/index.js`)

All tools operate relative to the configured workspace directory:

| Tool | Description | Notes |
|---|---|---|
| `list_files` | List directory with metadata | Returns name, type, size, modified |
| `read_file` | Read file content | Max 1MB |
| `write_file` | Create or overwrite a file | Creates parent dirs |
| `move_file` | Move or rename a file/directory | |
| `delete_file` | Delete a single file | Files only, not directories |
| `create_directory` | Create directory with parents | `mkdir -p` equivalent |
| `execute_shell` | Run shell commands | Timeout: 30s default, max 120s |
| `search_files` | Search by filename or content | Recursive search |

`ToolExecutor` resolves all paths relative to workspace and uses platform-aware shell commands (Windows vs. Unix).

---

## Settings & Configuration

Settings are persisted via `electron-store` (JSON file on disk). No `.env` files are used.

**Settings schema:**
```typescript
interface Settings {
  apiKey: string      // Anthropic API key
  workspace: string   // Root directory for all file operations
  model: string       // Claude model ID
  maxSteps: number    // Max agent loop iterations (5–100)
  userName: string    // Display name
  userPlan: string    // Subscription tier label
}
```

**Available models:**
- `claude-sonnet-4-20250514` — recommended, balanced
- `claude-opus-4-5` — most capable
- `claude-haiku-4-5-20251001` — fastest

---

## Development Workflow

### Prerequisites
- Node.js 18+
- pnpm 9.6+

### Install dependencies
```bash
pnpm install
```

### Start development
```bash
pnpm dev
```
This runs `scripts/dev-runner.js` which:
1. Kills any existing process on port 5173 (Windows-specific cleanup)
2. Starts the Vite dev server
3. Waits for Vite to be ready at `http://localhost:5173`
4. Launches Electron

**Individual processes:**
```bash
pnpm dev:vite      # Vite only (port 5173)
pnpm dev:electron  # Electron only (requires Vite running)
```

### Type checking
```bash
pnpm typecheck     # tsc --noEmit, no output files
```

### Production build
```bash
pnpm build         # vite build + electron-builder
```
Output goes to `dist-electron/`. Windows NSIS installer is the default target.

---

## TypeScript Configuration

- **Strict mode:** enabled
- **Path alias:** `@/*` maps to `src/*`
- **Target:** ESNext
- **Module:** ESNext with bundler resolution
- **`noEmit: true`** — TypeScript is type-check only; Vite handles transpilation

---

## Styling Conventions

- **No external CSS library** — all styles are inline `CSSProperties` objects in React components
- Style objects are defined at the **bottom** of each component file
- Global styles (resets, animations, scrollbar, fonts) live in `src/index.html` `<style>` block
- **Color palette:** Light mode — backgrounds `#fff`/`#fafafa`/`#f5f5f5`, text `#1a1a1a`/`#666`
- **Fonts:** Noto Sans SC (UI), IBM Plex Mono (code/terminal)
- **Layout:** Flexbox throughout

---

## Code Conventions

- **File naming:** PascalCase for React components (`ChatPage.tsx`), camelCase for utilities (`loop.js`)
- **IPC channel naming:** kebab-case strings (`agent-run`, `get-settings`)
- **React state:** `useState` + `useCallback` — no external state manager
- **Async:** Promise-based with `async/await`; event emitters used only in the agent loop
- **Backend:** Pure CommonJS (`require`/`module.exports`) in `electron/`
- **Frontend:** ES modules with TypeScript in `src/`

---

## Browser Mock (`src/electron-mock.ts`)

When running in a browser (no Electron), `electron-mock.ts` is injected automatically. It provides:
- `window.electron` with the same interface as the real preload
- Settings persisted to `localStorage`
- Stubbed `agent-run` that returns a mock response
- Useful for UI development without starting Electron

---

## Data Flow Summary

1. **Settings** flow: `SettingsModal` → `ipc.saveSettings()` → `electron-store` → restored on next launch via `ipc.getSettings()`
2. **Conversation state** is in-memory only (`App.tsx` `useState`) — not persisted across restarts
3. **Agent execution** state lives in `ChatPage.tsx`; messages accumulate during a session
4. **File operations** are always relative to `settings.workspace`

---

## Key Files for AI Assistants

When modifying or understanding the codebase, focus on these files:

| File | When to read |
|---|---|
| `src/types.ts` | Before working on any feature — all shared types |
| `electron/agent/loop.js` | Agent behavior, Claude API usage, event protocol |
| `electron/agent/tools/index.js` | Adding/modifying agent tools |
| `electron/main.js` | Adding new IPC channels or OS-level features |
| `electron/preload.js` | Exposing new APIs to the renderer |
| `src/App.tsx` | Global state, routing, settings loading |
| `src/components/ChatPage.tsx` | Message rendering, streaming, tool visualization |
| `src/components/SettingsModal.tsx` | Settings UI, all user-configurable options |

---

## No Test Suite

There is currently **no test framework** configured (no Jest, Vitest, etc.). Type safety is enforced via `pnpm typecheck`. When adding tests, Vitest is the recommended choice given the Vite build setup.

---

## No CI/CD

There is no `.github/workflows/` or CI configuration. All builds and releases are manual.

---

## Security Notes

- Electron context isolation is **enabled** — never disable it
- `nodeIntegration` is **disabled** — never enable it
- All renderer → main communication goes through the preload bridge
- Workspace path constrains agent file operations — never allow path traversal outside workspace
- API keys are stored in electron-store (local disk), never transmitted except to Anthropic's API
