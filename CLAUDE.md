# CLAUDE.md — Agent Desktop

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository.

---

## Project Overview

**Agent Desktop** is an Electron + React desktop application that wraps the Anthropic Claude API into a local AI agent. The agent can execute tasks autonomously using built-in tools for file system management, shell command execution, and search. It is modelled after the MiniMax Agent Desktop interface.

- **App ID:** `com.agent.desktop`
- **Default model:** `claude-sonnet-4-20250514`
- **Package manager:** `pnpm` (v9.6.0) — always use `pnpm`, never `npm` or `yarn`

---

## Technology Stack

| Layer | Technology |
|---|---|
| Desktop runtime | Electron 33 |
| UI framework | React 18 + TypeScript 5.7 |
| Build tool | Vite 6 |
| Packaging | electron-builder 25 |
| AI SDK | @anthropic-ai/sdk 0.39 |
| Persistence | electron-store 10 |
| Dev orchestration | concurrently, wait-on |

---

## Repository Structure

```
agent-desktop/
├── electron/                   # Electron main process (Node.js, CommonJS)
│   ├── main.js                 # App entry, window creation, IPC handlers
│   ├── preload.js              # Secure IPC bridge (contextBridge)
│   └── agent/
│       ├── loop.js             # AgentLoop class — agentic execution loop
│       └── tools/
│           └── index.js        # Tool definitions + ToolExecutor class
├── src/                        # React renderer (TypeScript/ESM)
│   ├── main.tsx                # Vite entry point
│   ├── App.tsx                 # Root component, global state management
│   ├── types.ts                # Shared TypeScript interfaces & window.electron types
│   ├── electron-mock.ts        # Browser-environment mock for window.electron API
│   └── components/
│       ├── Sidebar.tsx         # Left navigation, task history, user profile
│       ├── HomePage.tsx        # Landing page with task input & quick actions
│       ├── ChatPage.tsx        # Chat UI with streaming, tool events, agent status
│       └── SettingsModal.tsx   # Multi-tab settings dialog
├── scripts/
│   └── dev-runner.js           # Dev startup script (kills port 5173, starts Vite, then Electron)
├── package.json
├── tsconfig.json               # Strict TypeScript, ES2020 target, `@/*` → `src/*` alias
├── vite.config.ts              # Vite config for React renderer
├── pnpm-workspace.yaml
├── README.md                   # User-facing docs (Chinese)
├── DEV_INFO.md                 # Dual-environment (browser/Electron) development notes
└── start-dev.bat               # Windows convenience launcher
```

---

## Development Commands

```bash
# Install dependencies (always use pnpm)
pnpm install

# Start full development environment (Vite + Electron)
pnpm dev

# Start Vite dev server only (browser preview at http://localhost:5173)
pnpm dev:vite

# Start Electron only (waits for Vite on port 5173)
pnpm dev:electron

# TypeScript type checking (no emit)
pnpm typecheck

# Build and package as distributable (Windows NSIS installer → dist-electron/)
pnpm build
```

`pnpm dev` uses `scripts/dev-runner.js`, which:
1. Kills any existing process on port 5173
2. Starts the Vite dev server
3. Waits for it to become ready via `wait-on`
4. Launches the Electron app

---

## Architecture

### Electron Process Model

```
Renderer (React/Vite)
  │  window.electron.*  (contextBridge API)
  ▼
Preload (preload.js)     ←── contextBridge.exposeInMainWorld
  │  ipcRenderer.invoke / ipcRenderer.on
  ▼
Main Process (main.js)   ←── ipcMain.handle
  │
  ├── electron-store     (settings persistence)
  ├── dialog             (folder picker)
  └── AgentLoop          (AI agent execution)
        └── ToolExecutor (file system + shell tools)
```

**Security:** `contextIsolation: true`, `nodeIntegration: false`. The renderer process has no direct access to Node.js APIs — all privileged operations go through the preload bridge.

### IPC Channels

| Channel | Direction | Purpose |
|---|---|---|
| `get-settings` | Renderer → Main | Load persisted settings |
| `save-settings` | Renderer → Main | Persist settings to electron-store |
| `pick-folder` | Renderer → Main | Open native folder dialog |
| `agent-run` | Renderer → Main | Start agentic task |
| `agent-stop` | Renderer → Main | Interrupt running agent |
| `fs-list` | Renderer → Main | List directory for workspace panel |
| `open-explorer` | Renderer → Main | Open path in system file manager |
| `agent-event` | Main → Renderer | Stream agent progress events |

### Agent Execution Loop (`electron/agent/loop.js`)

`AgentLoop` is a simple agentic loop:

1. Sends `messages` to Claude via the Anthropic SDK (`messages.create`)
2. Emits IPC events for each response block:
   - `text` — assistant text output
   - `tool_start` — tool call initiated
3. Executes tool calls sequentially via `ToolExecutor`
4. Emits `tool_result` with duration and error flag
5. Appends results to the conversation and loops
6. Stops when Claude returns `end_turn` (no tool use), `maxSteps` is reached, or `.stop()` is called

**Default limits:** `max_tokens: 8096`, `maxSteps: 50` (configurable in settings).

### Agent Events (streamed via IPC to renderer)

```typescript
type AgentEvent =
  | { type: 'start'; workspace: string }
  | { type: 'step'; step: number; maxSteps: number }
  | { type: 'text'; text: string }
  | { type: 'tool_start'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; input: Record<string, unknown>; result: unknown; duration: number; isError: boolean }
  | { type: 'done'; text: string; steps: number }
  | { type: 'error'; message: string }
  | { type: 'stopped' }
  | { type: 'thinking' }
```

### Built-in Agent Tools (`electron/agent/tools/index.js`)

| Tool | Description |
|---|---|
| `list_files` | List directory (recursive up to 2 levels) |
| `read_file` | Read file content (< 1 MB limit) |
| `write_file` | Create or overwrite file (auto-creates parent dirs) |
| `move_file` | Move or rename file/directory |
| `delete_file` | Delete a single file (not directories) |
| `create_directory` | Create directory recursively |
| `execute_shell` | Run arbitrary shell command (120 s timeout, 8 MB output limit) |
| `search_files` | Search by filename or content (uses platform-native find/grep) |

All file paths are resolved relative to the configured `workspace` directory.

---

## React Frontend Structure

### Global State (`App.tsx`)

`App.tsx` owns all shared state and passes props down:
- `conversations: Conversation[]` — task/chat history
- `activeConversationId: string | null`
- `settings: Settings | null`
- `showSettings: boolean`

### Key Types (`src/types.ts`)

```typescript
interface Settings {
  apiKey: string       // Anthropic API key
  workspace: string    // Working directory for the agent
  model: string        // Claude model ID
  maxSteps: number     // Max agentic iterations (1–100)
  userName: string
  userPlan: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean  // true while agent is generating
  error?: boolean
  events?: ToolEvent[] // tool events attached to this message
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}
```

### Dual Environment Support (`electron-mock.ts`)

When running in the browser (Vite only, no Electron), `electron-mock.ts` is loaded instead of the real `window.electron` API. It:
- Stores settings in `localStorage`
- Returns stub/empty responses for agent calls
- Allows UI development without Electron

---

## Settings & Configuration

Settings are stored via `electron-store` (system config directory, not in the repo). Keys:

| Key | Default | Description |
|---|---|---|
| `apiKey` | `''` | Anthropic API key |
| `workspace` | `$HOME` | Agent working directory |
| `model` | `claude-sonnet-4-20250514` | Claude model ID |
| `maxSteps` | `50` | Max agent loop iterations |
| `userName` | `'用户'` | Display name |
| `userPlan` | `'免费'` | Plan label (UI only) |

No `.env` files are used. The app prompts for API key on first launch if it is unset.

---

## Code Conventions

### Module Systems
- **Electron main process** (`electron/`): CommonJS (`require`/`module.exports`)
- **React renderer** (`src/`): ESM (`import`/`export`), TypeScript

Do not mix these. Never use `require` in `src/`, never use `import` in `electron/`.

### TypeScript
- Strict mode is enabled — avoid `any`, use proper types
- Use the `@/*` path alias to import from `src/` (e.g., `import { Settings } from '@/types'`)
- All new React components should be `.tsx` files with typed props

### State Management
- No external state library (no Redux, Zustand, etc.)
- Lift state to the nearest common ancestor
- `App.tsx` is the single source of truth for global state
- Prefer `useState` and prop drilling for local/scoped state

### Styling
- No CSS framework (no Tailwind, no MUI) — inline styles and plain CSS
- Match the existing visual style (dark sidebar, white main content area)

### No Tests
- There is currently no test framework configured
- Do not add test runners or test files without discussing with the user first
- `pnpm typecheck` is the only automated code quality check available

---

## Building & Distribution

```bash
pnpm build
```

This runs `vite build` (outputs to `dist/`) followed by `electron-builder`, which packages the app:
- **Output:** `dist-electron/`
- **Windows target:** NSIS installer (`.exe`)
- **macOS target:** default (category: productivity)

The packaged app bundles `dist/`, `electron/`, and `package.json`.

---

## Common Tasks for AI Assistants

### Adding a New Agent Tool

1. Add a tool definition object to `TOOL_DEFINITIONS` in `electron/agent/tools/index.js`
2. Add the corresponding execution case in `ToolExecutor.execute()` in the same file
3. The tool is automatically available to the agent loop — no other changes needed

### Adding a New IPC Channel

1. Add `ipcMain.handle('channel-name', ...)` in `electron/main.js`
2. Expose it via `contextBridge.exposeInMainWorld` in `electron/preload.js`
3. Add the type signature to `window.electron` in `src/types.ts`

### Modifying the Agent System Prompt

The system prompt is a template string in `electron/agent/loop.js` (`SYSTEM_PROMPT` const). It is currently in Chinese. Edit it there — it is sent with every API call.

### Changing the Default Claude Model

Change the default in two places:
- `ipcMain.handle('get-settings', ...)` in `electron/main.js`
- `ipcMain.handle('agent-run', ...)` in `electron/main.js`

### Running Without Electron (Browser Dev)

```bash
pnpm dev:vite
```

Open `http://localhost:5173`. The `electron-mock.ts` shim will be used automatically. Settings are stored in `localStorage`. Agent calls return stubs.

---

## Important Constraints

- **Do not push to `master` directly.** Work on feature branches.
- **Always use `pnpm`** — there is no `package-lock.json` or `yarn.lock`.
- **The agent has full shell and file system access** when running in Electron. Be careful when modifying `execute_shell` or file tool implementations — they run with the user's OS permissions.
- **Destructive operations** (`delete_file`, overwriting files, shell commands) should always prompt for confirmation in the UI before executing. This is enforced by the system prompt instruction to the agent, not by hard code.
- **API key is never committed** — it is stored only in electron-store on the user's machine.
