const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  agentRun: (p) => ipcRenderer.invoke('agent-run', p),
  agentStop: (conversationId) => ipcRenderer.invoke('agent-stop', conversationId),
  onAgentEvent: (cb) => {
    const h = (_, d) => cb(d)
    ipcRenderer.on('agent-event', h)
    return () => ipcRenderer.removeListener('agent-event', h)
  },
  fsList: (d) => ipcRenderer.invoke('fs-list', d),
  openInExplorer: (p) => ipcRenderer.invoke('open-in-explorer', p),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  // Auto launch
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  // Chat API — 通过本地代理服务器转发（渲染进程无需持有 API Key）
  chatMessage: (p) => ipcRenderer.invoke('chat-message', p),
  // ── 本地代理服务器 ──────────────────────────────────────────────────────
  getProxyPort: () => ipcRenderer.invoke('get-proxy-port'),
  getProxyConfig: () => ipcRenderer.invoke('get-proxy-config'),
  saveProxyConfig: (p) => ipcRenderer.invoke('save-proxy-config', p),
  testProxyProvider: (p) => ipcRenderer.invoke('test-proxy-provider', p),
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  // Agent Hub (多 Agent 支持)
  checkAvailableAgents: () => ipcRenderer.invoke('agent:check-available'),
  testAgent: (params) => ipcRenderer.invoke('agent:test', params),
  selectBestAgent: () => ipcRenderer.invoke('agent:select-best'),
  // Auth
  authCheck: () => ipcRenderer.invoke('auth:check'),
  authLogin: (userName) => ipcRenderer.invoke('auth:login', userName),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  // Account Management
  getAccounts: () => ipcRenderer.invoke('auth:getAccounts'),
  createAccount: (userName, userAvatar) => ipcRenderer.invoke('auth:createAccount', { userName, userAvatar }),
  getAccountInfo: (userName) => ipcRenderer.invoke('auth:getAccountInfo', userName),
  deleteAccount: (userName) => ipcRenderer.invoke('auth:deleteAccount', userName),
  updateAvatar: (userName, userAvatar) => ipcRenderer.invoke('auth:updateAvatar', { userName, userAvatar }),
  // Conversations persistence
  convList: () => ipcRenderer.invoke('conv:list'),
  convSave: (conv) => ipcRenderer.invoke('conv:save', conv),
  convDelete: (id) => ipcRenderer.invoke('conv:delete', id),
})
