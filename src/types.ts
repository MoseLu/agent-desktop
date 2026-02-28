export interface FolderPermission {
  path: string
  permission: 'read' | 'write' | 'read-write'
}

/** 用户账号信息 */
export interface UserAccount {
  userName: string
  userAvatar?: string
  createdAt: string
}

/** 代理配置中单个 provider 的状态（apiKey 已掩码，可安全传给渲染进程） */
export interface ProxyProviderStatus {
  configured: boolean  // 是否已设置 API Key
  maskedKey : string   // 掩码后的 Key，如 "sk-a***b123"
  baseUrl   : string   // 上游 API 地址
}

/** 全局代理配置状态 */
export interface ProxyConfigStatus {
  minimax?    : ProxyProviderStatus
  qwen?       : ProxyProviderStatus
  qwenCoding? : ProxyProviderStatus
  anthropic?  : ProxyProviderStatus
}

/** 可用模型条目（由后端根据已配置 provider 动态返回） */
export interface ModelOption {
  value: string
  label: string
  group: 'qwen-coding' | 'minimax' | 'qwen' | 'claude' | 'glm' | 'kimi'
  description?: string
}

export interface Settings {
  apiKey?: string
  workspace: string
  model: string
  maxSteps: number
  userName: string
  userPlan: string
  userAvatar?: string
  theme: 'light' | 'dark' | 'system'
  language: string
  autoOpenTask: boolean
  desktopNotifications: boolean
  taskCompleteNotify: boolean
  soundNotify: boolean
  // MiniMax Agent 桌面设置
  showInMenuBar?: boolean
  autoStart?: boolean
  shortcut?: string
  minimaxWorkspace?: string
  commandWhitelist?: string[]
  folderPermissions?: FolderPermission[]
}

export interface ToolEvent {
  type: 'tool_start' | 'tool_result'
  id: string
  name: string
  input: Record<string, unknown>
  result?: Record<string, unknown>
  duration?: number
  isError?: boolean
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  error?: boolean
  events?: ToolEvent[]
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  tabId?: string  // 关联的标签 ID
  parentId?: string  // 父会话 ID（分支会话时设置）
  smartMode?: boolean  // 全能模式(true) / 高效模式(false)，在首页选择后锁定
  mode?: AppMode  // 'chat' | 'code'，创建时锁定
}

/** 用于持久化到 electron-store 的会话记录（不含瞬态字段） */
export interface StoredConversation {
  id: string
  title: string
  mode: AppMode
  smartMode: boolean
  parentId?: string
  createdAt: string  // ISO 字符串
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    error?: boolean
    events?: ToolEvent[]
  }>
}

export interface ScheduledTask {
  id: string
  name: string
  description: string
  frequency: 'daily' | 'weekly' | 'interval'
  weekday?: number
  scheduledTime?: string
  intervalValue?: number
  intervalUnit?: 'hour' | 'minute'
  createdAt: Date
}

export interface Tab {
  id: string
  title: string
  conversationId?: string  // 关联的对话 ID，默认标签为 undefined
  isDefault: boolean  // 是否为默认标签
}

export interface AgentEvent {
  type: 'start' | 'step' | 'text' | 'tool_start' | 'tool_result' | 'done' | 'error' | 'stopped' | 'thinking'
  [key: string]: unknown
}

/** chat = 纯对话，浏览器/桌面均支持；code = 完整 agent，仅 Electron */
export type AppMode = 'chat' | 'code'

declare global {
  interface Window {
    electron: {
      getSettings: () => Promise<Settings>
      saveSettings: (s: Partial<Settings>) => Promise<{ ok: boolean }>
      pickFolder: () => Promise<string | null>
      agentRun: (p: { messages: Pick<Message, 'role' | 'content'>[]; workspace: string }) => Promise<{ result?: unknown; error?: string }>
      agentStop: () => Promise<{ ok: boolean }>
      onAgentEvent: (cb: (ev: AgentEvent) => void) => () => void
      fsList: (dir: string) => Promise<{ name: string; isDir: boolean; path: string }[]>
      openInExplorer: (p: string) => void
      openExternal: (url: string) => Promise<void>
      setAutoLaunch: (enabled: boolean) => Promise<{ ok: boolean }>
      getAutoLaunch: () => Promise<{ openAtLogin: boolean }>
      // 本地代理服务器
      getProxyPort: () => Promise<number>
      getProxyConfig: () => Promise<ProxyConfigStatus>
      saveProxyConfig: (p: { provider: string; apiKey?: string; baseUrl?: string }) => Promise<{ ok: boolean; error?: string }>
      testProxyProvider: (p: { provider: string }) => Promise<{ ok: boolean; content?: string; error?: string }>
      getAvailableModels: () => Promise<ModelOption[]>
      // Agent Hub (多 Agent 支持)
      checkAvailableAgents: () => Promise<string[]>
      testAgent: (params: { model: string }) => Promise<{ success: boolean; content?: string; error?: string }>
      selectBestAgent: () => Promise<{ success: boolean; agent?: string; error?: string }>
      // Auth
      authCheck: () => Promise<{ userName: string | null }>
      authLogin: (userName: string) => Promise<{ ok: boolean }>
      authLogout: () => Promise<{ ok: boolean }>
      // Account Management
      getAccounts: () => Promise<UserAccount[]>
      createAccount: (userName: string, userAvatar?: string) => Promise<{ ok: boolean; error?: string; account?: UserAccount }>
      getAccountInfo: (userName: string) => Promise<UserAccount | null>
      deleteAccount: (userName: string) => Promise<{ ok: boolean; error?: string }>
      updateAvatar: (userName: string, userAvatar: string) => Promise<{ ok: boolean; error?: string }>
      // Conversations persistence
      convList: () => Promise<StoredConversation[]>
      convSave: (conv: StoredConversation) => Promise<{ ok: boolean }>
      convDelete: (id: string) => Promise<{ ok: boolean }>
    }
  }
}
