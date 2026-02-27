const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  agentRun: (p) => ipcRenderer.invoke('agent-run', p),
  agentStop: () => ipcRenderer.invoke('agent-stop'),
  onAgentEvent: (cb) => {
    const h = (_, d) => cb(d)
    ipcRenderer.on('agent-event', h)
    return () => ipcRenderer.removeListener('agent-event', h)
  },
  fsList: (d) => ipcRenderer.invoke('fs-list', d),
  openInExplorer: (p) => ipcRenderer.invoke('open-in-explorer', p),
  // Auto launch
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
})
