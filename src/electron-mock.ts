/**
 * Electron API mock for browser development
 * This file injects mock implementations when window.electron is not available.
 * Only used during browser-based development (not in actual Electron app).
 */

interface Settings {
  apiKey: string;
  workspace: string;
  model: string;
  maxSteps: number;
  userName: string;
  userPlan: string;
  userAvatar?: string;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  autoOpenTask?: boolean;
  desktopNotifications?: boolean;
  taskCompleteNotify?: boolean;
  soundNotify?: boolean;
  showInMenuBar?: boolean;
  autoStart?: boolean;
  shortcut?: string;
}

interface ToolEvent {
  type: 'tool_start' | 'tool_result';
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  duration?: number;
  isError?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  error?: boolean;
  events?: ToolEvent[];
}

interface AgentEvent {
  type: 'start' | 'step' | 'text' | 'tool_start' | 'tool_result' | 'done' | 'error' | 'stopped' | 'thinking';
  [key: string]: unknown;
}

interface ElectronAPI {
  getSettings: () => Promise<Settings>;
  saveSettings: (s: Partial<Settings>) => Promise<{ ok: boolean }>;
  pickFolder: () => Promise<string | null>;
  agentRun: (p: { messages: Pick<Message, 'role' | 'content'>[]; workspace: string }) => Promise<{ result?: unknown; error?: string }>;
  agentStop: () => Promise<{ ok: boolean }>;
  onAgentEvent: (cb: (ev: AgentEvent) => void) => () => void;
  fsList: (dir: string) => Promise<{ name: string; isDir: boolean; path: string }[]>;
  openInExplorer: (p: string) => void;
  openExternal: (url: string) => Promise<void>;
}

// ─── 模型检测工具 ────────────────────────────────────────────────────────────

function isMiniMaxModel(model: string): boolean {
  return !!(model?.toLowerCase().includes('minimax'))
}

function isQwenModel(model: string): boolean {
  return !!(model?.toLowerCase().includes('qwen') || model?.toLowerCase().includes('qwq'))
}

// ─── 全局事件总线（替代随机 interval） ────────────────────────────────────────

let agentEventListeners: Array<(ev: AgentEvent) => void> = []
let stopRequested = false

function emitAgentEvent(ev: AgentEvent) {
  agentEventListeners.forEach(cb => {
    try { cb(ev) } catch (e) { console.error('[Mock] Event listener error:', e) }
  })
}

// ─── API 调用函数 ─────────────────────────────────────────────────────────────

async function callMiniMaxAPI(
  apiKey: string,
  model: string,
  messages: Pick<Message, 'role' | 'content'>[]
): Promise<string> {
  const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      model,
      max_tokens: 8096,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(`MiniMax API 错误 (${response.status}): ${(errData as any).error?.message || response.statusText}`)
  }

  const data = await response.json() as any
  return data.content
    ?.filter((b: any) => b.type === 'text')
    ?.map((b: any) => b.text)
    ?.join('') ?? ''
}

async function callQwenAPI(
  apiKey: string,
  model: string,
  messages: Pick<Message, 'role' | 'content'>[]
): Promise<string> {
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(`Qwen API 错误 (${response.status}): ${(errData as any).error?.message || response.statusText}`)
  }

  const data = await response.json() as any
  return data.choices?.[0]?.message?.content ?? ''
}

// ─── Mock 工厂 ────────────────────────────────────────────────────────────────

const createMockElectron = (): ElectronAPI => {
  console.warn('[Electron Mock] 当前运行在浏览器环境，使用 Mock API（支持 MiniMax / Qwen）')

  const SETTINGS_KEY = 'electron-settings'

  let settings: Settings = {
    apiKey: '',
    workspace: '/workspace',
    model: 'MiniMax-M2.5',
    maxSteps: 20,
    userName: '开发者',
    userPlan: '免费',
    userAvatar: '',
    theme: 'system',
    language: 'zh-CN',
    autoOpenTask: false,
    desktopNotifications: false,
    taskCompleteNotify: false,
    soundNotify: false,
    showInMenuBar: true,
    autoStart: false,
    shortcut: 'Alt+A',
  }

  // 从 localStorage 恢复设置
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      settings = { ...settings, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.warn('[Mock] 无法加载存储的设置，使用默认值')
  }

  return {
    getSettings: () => Promise.resolve({ ...settings }),

    saveSettings: async (newSettings: Partial<Settings>) => {
      settings = { ...settings, ...newSettings }
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      } catch (e) {
        console.warn('[Mock] 无法保存设置到 localStorage')
      }
      return { ok: true }
    },

    pickFolder: async () => {
      const path = prompt('输入工作目录路径：', settings.workspace)
      return path ?? null
    },

    // 浏览器模式下 Code 模式不可用；Chat 模式直接用 chatApi.ts，不走此处
    agentRun: async () => {
      const errMsg = 'Code 模式仅在 Electron 桌面端可用'
      emitAgentEvent({ type: 'error', message: errMsg })
      return { error: errMsg }
    },

    agentStop: async () => {
      stopRequested = true
      emitAgentEvent({ type: 'stopped' })
      return { ok: true }
    },

    onAgentEvent: (cb: (ev: AgentEvent) => void) => {
      agentEventListeners.push(cb)
      return () => {
        agentEventListeners = agentEventListeners.filter(l => l !== cb)
      }
    },

    fsList: async (dirPath: string) => {
      console.log(`[Mock] 列出目录: ${dirPath}`)
      return [
        { name: 'documents', isDir: true, path: `${dirPath}/documents` },
        { name: 'projects', isDir: true, path: `${dirPath}/projects` },
        { name: 'readme.md', isDir: false, path: `${dirPath}/readme.md` },
      ]
    },

    openInExplorer: (path: string) => {
      console.log(`[Mock] 打开文件浏览器: ${path}`)
    },

    openExternal: async (url: string) => {
      window.open(url, '_blank')
    },
  }
}

// 仅在浏览器中且 window.electron 不存在时注入 mock
if (typeof window !== 'undefined' && !(window as any).electron) {
  const mock = createMockElectron()
  // 标记为 mock，供 isRealElectron() 判断（区分真实 Electron 和浏览器）
  ;(mock as any).__isMock = true
  ;(window as any).electron = mock
} else if (typeof window !== 'undefined') {
  console.log('[Electron] 使用真实 Electron API')
}
