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

// Define the mock implementation
const createMockElectron = (): ElectronAPI => {
  console.warn('[Electron Mock] You are running in a browser environment. Some features may use mock data.');

  // Load settings from localStorage to persist during development
  const SETTINGS_KEY = 'electron-settings';
  
  let settings: Settings = {
    apiKey: '',
    workspace: 'C:\\Users\\Public\\Desktop', // Default mock path
    model: 'claude-sonnet-4-20250514',
    maxSteps: 50,
    userName: '开发者',
    userPlan: '开发版',
  };

  // Try to load from localStorage
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      settings = { ...settings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Could not load stored settings, using defaults');
  }

  return {
    getSettings: () => Promise.resolve(settings),
    
    saveSettings: async (newSettings: Partial<Settings>) => {
      settings = { ...settings, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn('Could not save settings to localStorage');
      }
      return { ok: true };
    },
    
    pickFolder: async () => {
      alert('Mock: Folder picker called. Returning default path.');
      return settings.workspace;
    },
    
    agentRun: async ({ messages, workspace }) => {
      console.log('[Mock] Agent run called with:', { messages, workspace });
      // Simulate an agent run that processes the message
      try {
        // Simulate some processing and a fake response
        return {
          result: {
            content: `[MOCK] 假设这是对 "${messages[messages.length - 1]?.content || '您的消息'}" 的处理结果。实际的 agent 运行需要在 Electron 环境中进行。`,
            status: 'completed',
            execution_log: [
              { tool: 'mock_tool1', input: {}, result: { success: true } },
              { tool: 'mock_tool2', input: {}, result: { success: false } }
            ]
          }
        };
      } catch (error) {
        return { error: 'Mock agent runtime error: ' + (error as Error).message };
      }
    },
    
    agentStop: async () => {
      console.log('[Mock] Agent stop called');
      return { ok: true };
    },
    
    onAgentEvent: (cb: (ev: AgentEvent) => void) => {
      // Mock event emission - just emit a few sample events occasionally
      const interval = setInterval(() => {
        const mockEvents: AgentEvent[] = [
          { type: 'thinking', message: 'Mock agent is processing your request...' },
          { type: 'tool_start', name: 'shell', input: { command: 'echo Mocking shell operation' } },
          { type: 'tool_result', name: 'shell', result: { stdout: 'Mock result', stderr: '' } }
        ];
        
        const event = mockEvents[Math.floor(Math.random() * mockEvents.length)];
        cb(event);
      }, 3000);

      // Return unsubscribe function
      return () => clearInterval(interval);
    },
    
    fsList: async (dirPath: string) => {
      console.log(`[Mock] Listing directory: ${dirPath}`);
      // Simulate a directory listing with mock data
      return [
        { name: 'documents', isDir: true, path: `${dirPath}/documents` },
        { name: 'desktop', isDir: true, path: `${dirPath}/desktop` },
        { name: 'example.txt', isDir: false, path: `${dirPath}/example.txt` },
        { name: 'project', isDir: true, path: `${dirPath}/project` },
        { name: 'readme.md', isDir: false, path: `${dirPath}/readme.md` },
      ];
    },
    
    openInExplorer: (path: string) => {
      console.log(`[Mock] Would open explorer at: ${path}`);
      alert(`Would open file explorer at: ${path}`);
    },

    openExternal: async (url: string) => {
      console.log(`[Mock] Would open external URL: ${url}`);
    }
  };
};

// Inject the mock if window.electron doesn't exist
if (typeof window !== 'undefined' && !(window as any).electron) {
  (window as any).electron = createMockElectron();
} else if (typeof window !== 'undefined') {
  // If window.electron already exists, we're in a real Electron environment
  console.log('[Electron] Using real Electron API');
}