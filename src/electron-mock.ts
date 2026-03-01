/**
 * Electron API mock for browser development
 * This file injects mock implementations when window.electron is not available.
 * Only used during browser-based development (not in actual Electron app).
 */

interface Settings {
  apiKey?: string;
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

interface StoredConversation {
  id: string;
  title: string;
  mode: 'chat' | 'code';
  smartMode: boolean;
  parentId?: string;
  createdAt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; error?: boolean }>;
}

interface ElectronAPI {
  getSettings: () => Promise<Settings>;
  saveSettings: (s: Partial<Settings>) => Promise<{ ok: boolean }>;
  pickFolder: () => Promise<string | null>;
  agentRun: (p: { messages: Pick<Message, 'role' | 'content'>[]; workspace: string }) => Promise<{ result?: unknown; error?: string }>;
  chatMessage: (p: { model: string; messages: { role: string; content: string }[] }) => Promise<{ ok: boolean; status?: number; data?: any; error?: string }>;
  agentStop: () => Promise<{ ok: boolean }>;
  onAgentEvent: (cb: (ev: AgentEvent) => void) => () => void;
  fsList: (dir: string) => Promise<{ name: string; isDir: boolean; path: string }[]>;
  openInExplorer: (p: string) => void;
  openExternal: (url: string) => Promise<void>;
  setAutoLaunch: (enabled: boolean) => Promise<{ ok: boolean }>;
  getAutoLaunch: () => Promise<{ openAtLogin: boolean }>;
  getProxyPort: () => Promise<number>;
  getProxyConfig: () => Promise<any>;
  saveProxyConfig: (p: any) => Promise<{ ok: boolean; error?: string }>;
  testProxyProvider: (p: any) => Promise<{ ok: boolean; content?: string; error?: string }>;
  getAvailableModels: () => Promise<any[]>;
  checkAvailableAgents: () => Promise<string[]>;
  testAgent: (params: any) => Promise<{ success: boolean; content?: string; error?: string }>;
  selectBestAgent: () => Promise<{ success: boolean; agent?: string; error?: string }>;
  authCheck: () => Promise<{ userName: string | null }>;
  authLogin: (userName: string) => Promise<{ ok: boolean }>;
  authLogout: () => Promise<{ ok: boolean }>;
  getAccounts: () => Promise<any[]>;
  createAccount: (userName: string, userAvatar?: string) => Promise<{ ok: boolean; error?: string; account?: any }>;
  getAccountInfo: (userName: string) => Promise<any | null>;
  deleteAccount: (userName: string) => Promise<{ ok: boolean; error?: string }>;
  updateAvatar: (userName: string, userAvatar: string) => Promise<{ ok: boolean; error?: string }>;
  convList: () => Promise<StoredConversation[]>;
  convSave: (conv: StoredConversation) => Promise<{ ok: boolean }>;
  convDelete: (id: string) => Promise<{ ok: boolean }>;
}

// ─── 全局事件总线（替代随机 interval） ────────────────────────────────────────

let agentEventListeners: Array<(ev: AgentEvent) => void> = []
let stopRequested = false

function emitAgentEvent(ev: AgentEvent) {
  agentEventListeners.forEach(cb => {
    try { cb(ev) } catch (e) { console.error('[Mock] Event listener error:', e) }
  })
}

// ─── Mock 工厂 ────────────────────────────────────────────────────────────────

const createMockElectron = (): ElectronAPI => {
  console.warn('[Electron Mock] 当前运行在浏览器环境，使用 Mock API（支持 MiniMax / Qwen）')

  const SETTINGS_KEY = 'electron-settings'

  let settings: Settings = {
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

    // Chat 模式 IPC 调用（浏览器模式下通过 chatApi.ts 走 proxy）
    chatMessage: async ({ model, messages }: { model: string; messages: { role: string; content: string }[] }) => {
      // 浏览器模式下，chatMessage 应该走 callViaBrowserProxy，而不是这里
      // 这里返回错误，让 chatApi.ts 处理
      return { ok: false, error: '请使用浏览器代理路径' }
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

    // Auto launch
    setAutoLaunch: async (enabled: boolean) => {
      return { ok: true }
    },
    getAutoLaunch: async () => {
      return { openAtLogin: false }
    },

    // Proxy
    getProxyPort: async () => {
      return 8080
    },
    getProxyConfig: async () => {
      return { provider: '', apiKey: '' }
    },
    saveProxyConfig: async (p: any) => {
      return { ok: true }
    },
    testProxyProvider: async (p: any) => {
      return { ok: true, content: 'Mock OK' }
    },

    // Models & Agents
    getAvailableModels: async () => {
      return [
        // 推荐模型
        { value: 'qwen3.5-plus', label: 'Qwen3.5 Plus', group: '百炼 Coding Plan', description: '支持图片理解' },
        { value: 'kimi-k2.5', label: 'Kimi K2.5', group: 'Kimi', description: '支持图片理解' },
        { value: 'glm-5', label: 'GLM-5', group: '智谱 GLM' },
        { value: 'MiniMax-M2.5', label: 'MiniMax M2.5', group: 'MiniMax Coding Plan' },
        // 更多模型
        { value: 'qwen3-max-2026-01-23', label: 'Qwen3 Max', group: '百炼 Coding Plan' },
        { value: 'qwen3-coder-next', label: 'Qwen3 Coder Next', group: '百炼 Coding Plan' },
        { value: 'qwen3-coder-plus', label: 'Qwen3 Coder Plus', group: '百炼 Coding Plan' },
        { value: 'glm-4.7', label: 'GLM-4.7', group: '智谱 GLM' },
      ]
    },
    checkAvailableAgents: async () => {
      return []
    },
    testAgent: async (params: any) => {
      return { success: true, content: 'Mock OK' }
    },
    selectBestAgent: async () => {
      return { success: true, agent: 'default' }
    },

    authCheck: async () => {
      const userName = localStorage.getItem('mock-auth-user') || '开发者'
      return { userName }
    },

    authLogin: async (userName: string) => {
      localStorage.setItem('mock-auth-user', userName)
      return { ok: true }
    },

    authLogout: async () => {
      localStorage.removeItem('mock-auth-user')
      return { ok: true }
    },

    // Account Management
    getAccounts: async () => {
      const stored = localStorage.getItem('mock-accounts')
      let accounts = stored ? JSON.parse(stored) : []
      // 如果没有账号，创建默认账号
      if (accounts.length === 0) {
        const defaultAccount = {
          userName: '默认账号',
          userAvatar: '',
          createdAt: new Date().toISOString(),
        }
        accounts = [defaultAccount]
        localStorage.setItem('mock-accounts', JSON.stringify(accounts))
      }
      return accounts
    },

    createAccount: async (userName: string, userAvatar = '') => {
      if (!userName || !userName.trim()) {
        return { ok: false, error: '用户名不能为空' }
      }
      const stored = localStorage.getItem('mock-accounts')
      const accounts: any[] = stored ? JSON.parse(stored) : []
      if (accounts.some(a => a.userName === userName.trim())) {
        return { ok: false, error: '该用户名已存在' }
      }
      const newAccount = {
        userName: userName.trim(),
        userAvatar,
        createdAt: new Date().toISOString(),
      }
      accounts.push(newAccount)
      localStorage.setItem('mock-accounts', JSON.stringify(accounts))
      return { ok: true, account: newAccount }
    },

    getAccountInfo: async (userName: string) => {
      const stored = localStorage.getItem('mock-accounts')
      const accounts: any[] = stored ? JSON.parse(stored) : []
      return accounts.find(a => a.userName === userName) || null
    },

    deleteAccount: async (userName: string) => {
      const stored = localStorage.getItem('mock-accounts')
      const accounts: any[] = stored ? JSON.parse(stored) : []
      const filtered = accounts.filter(a => a.userName !== userName)
      if (filtered.length === accounts.length) {
        return { ok: false, error: '账号不存在' }
      }
      if (filtered.length === 0) {
        return { ok: false, error: '不能删除最后一个账号' }
      }
      localStorage.setItem('mock-accounts', JSON.stringify(filtered))
      return { ok: true }
    },

    updateAvatar: async (userName: string, userAvatar: string) => {
      const stored = localStorage.getItem('mock-accounts')
      const accounts: any[] = stored ? JSON.parse(stored) : []
      const idx = accounts.findIndex(a => a.userName === userName)
      if (idx === -1) {
        return { ok: false, error: '账号不存在' }
      }
      accounts[idx] = { ...accounts[idx], userAvatar }
      localStorage.setItem('mock-accounts', JSON.stringify(accounts))
      return { ok: true }
    },

    convList: async () => {
      const userName = localStorage.getItem('mock-auth-user') || 'default'
      try {
        const key = `mock-conv-${userName}`
        const stored = localStorage.getItem(key)
        return stored ? JSON.parse(stored) : []
      } catch { return [] }
    },

    convSave: async (conv: StoredConversation) => {
      const userName = localStorage.getItem('mock-auth-user') || 'default'
      try {
        const key = `mock-conv-${userName}`
        const convs: StoredConversation[] = JSON.parse(localStorage.getItem(key) || '[]')
        const idx = convs.findIndex(c => c.id === conv.id)
        if (idx >= 0) convs[idx] = conv
        else convs.unshift(conv)
        localStorage.setItem(key, JSON.stringify(convs))
      } catch (e) { console.warn('[Mock] convSave failed', e) }
      return { ok: true }
    },

    convDelete: async (id: string) => {
      const userName = localStorage.getItem('mock-auth-user') || 'default'
      try {
        const key = `mock-conv-${userName}`
        const convs: StoredConversation[] = JSON.parse(localStorage.getItem(key) || '[]')
        localStorage.setItem(key, JSON.stringify(convs.filter(c => c.id !== id)))
      } catch (e) { console.warn('[Mock] convDelete failed', e) }
      return { ok: true }
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
