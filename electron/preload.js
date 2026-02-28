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
  // Chat API proxy (routes through Node.js to avoid renderer CORS)
  chatMessage: (p) => ipcRenderer.invoke('chat-message', p),
  // Agent Hub (多 Agent 支持)
  checkAvailableAgents: () => ipcRenderer.invoke('agent:check-available'),
  testAgent: (params) => ipcRenderer.invoke('agent:test', params),
  selectBestAgent: () => ipcRenderer.invoke('agent:select-best'),
})
