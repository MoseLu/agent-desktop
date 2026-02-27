export interface FolderPermission {
  path: string
  permission: 'read' | 'write' | 'read-write'
}

export interface Settings {
  apiKey: string
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
    }
  }
}
