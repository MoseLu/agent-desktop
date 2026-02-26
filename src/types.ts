export interface Settings {
  apiKey: string
  workspace: string
  model: string
  maxSteps: number
  userName: string
  userPlan: string
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
    }
  }
}
