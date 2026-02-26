const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const Store = require('electron-store')
const AgentLoop = require('./agent/loop')

const store = new Store()
const isDev = !app.isPackaged

let mainWindow
let agentLoop

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    // Native Windows titlebar - exactly like MiniMax
    frame: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

// ─── Settings ─────────────────────────────────────────────────────────────────
ipcMain.handle('get-settings', () => ({
  apiKey: store.get('apiKey', ''),
  workspace: store.get('workspace', app.getPath('home')),
  model: store.get('model', 'claude-sonnet-4-20250514'),
  maxSteps: store.get('maxSteps', 50),
  userName: store.get('userName', '用户'),
  userPlan: store.get('userPlan', '免费'),
}))

ipcMain.handle('save-settings', (_, s) => {
  Object.entries(s).forEach(([k, v]) => store.set(k, v))
  return { ok: true }
})

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: store.get('workspace', app.getPath('home')),
  })
  return result.canceled ? null : result.filePaths[0]
})

// ─── Agent ────────────────────────────────────────────────────────────────────
ipcMain.handle('agent-run', async (_, { messages, workspace }) => {
  const apiKey = store.get('apiKey', '')
  const model = store.get('model', 'claude-sonnet-4-20250514')
  const maxSteps = store.get('maxSteps', 50)

  if (!apiKey) return { error: '请先在设置中填写 API Key' }

  agentLoop = new AgentLoop({
    apiKey, model, workspace, maxSteps,
    onEvent: (ev) => mainWindow?.webContents.send('agent-event', ev),
  })

  try {
    return { result: await agentLoop.run(messages) }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('agent-stop', () => { agentLoop?.stop(); return { ok: true } })

// ─── Filesystem ───────────────────────────────────────────────────────────────
ipcMain.handle('fs-list', async (_, dirPath) => {
  const fs = require('fs').promises
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.map(e => ({
      name: e.name,
      isDir: e.isDirectory(),
      path: path.join(dirPath, e.name),
    })).sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name))
  } catch { return [] }
})

ipcMain.handle('open-in-explorer', (_, p) => shell.showItemInFolder(p))
