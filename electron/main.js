const { app, BrowserWindow, ipcMain, shell, dialog, globalShortcut, Menu } = require('electron')
const path = require('path')
const AgentLoop = require('./agent/loop')

// electron-store 是 ESM 模块，需要动态导入
let Store
let store
const isDev = !app.isPackaged

async function initStore() {
  Store = (await import('electron-store')).default
  store = new Store()
}

// 移除默认菜单栏
function removeDefaultMenu() {
  Menu.setApplicationMenu(null)
}

let mainWindow
let agentLoop

function createWindow() {
  // 从 store 读取主题，决定背景色
  const theme = store?.get('theme', 'system') || 'system'
  let backgroundColor = '#ffffff'
  
  if (theme === 'dark') {
    backgroundColor = '#1a1a1a'
  } else if (theme === 'system') {
    // 检测系统主题
    const shouldUseDarkColors = app.shouldUseDarkColors
    if (shouldUseDarkColors) {
      backgroundColor = '#1a1a1a'
    }
  }
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    // Native Windows titlebar - exactly like MiniMax
    frame: true,
    backgroundColor: backgroundColor,
    icon: path.join(__dirname, '../assets/icon.ico'),
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

app.whenReady().then(async () => {
  // 先初始化 store
  await initStore()
  
  // 移除默认菜单
  removeDefaultMenu()
  
  createWindow()
  
  // 注册全局快捷键：Ctrl+Shift+A 唤起窗口
  try {
    globalShortcut.register('CommandOrControl+Shift+A', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
      }
    })
  } catch (err) {
    console.error('Failed to register global shortcut:', err)
  }
})

app.on('window-all-closed', () => { 
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit() 
})

app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

// ─── Settings ─────────────────────────────────────────────────────────────────
ipcMain.handle('get-settings', () => ({
  apiKey: store.get('apiKey', ''),
  workspace: store.get('workspace', app.getPath('home')),
  model: store.get('model', 'claude-sonnet-4-20250514'),
  maxSteps: store.get('maxSteps', 50),
  userName: store.get('userName', '开发者'),
  userPlan: store.get('userPlan', '免费'),
  userAvatar: store.get('userAvatar', ''),
  theme: store.get('theme', 'system'),
  language: store.get('language', 'zh-CN'),
  autoOpenTask: store.get('autoOpenTask', true),
  desktopNotifications: store.get('desktopNotifications', true),
  taskCompleteNotify: store.get('taskCompleteNotify', true),
  soundNotify: store.get('soundNotify', false),
  showInMenuBar: store.get('showInMenuBar', true),
  autoStart: store.get('autoStart', false),
  shortcut: store.get('shortcut', 'Alt+A'),
}))

ipcMain.handle('save-settings', (_, s) => {
  Object.entries(s).forEach(([k, v]) => store.set(k, v))
  return { ok: true }
})

// ─── Auto Launch ──────────────────────────────────────────────────────────────
ipcMain.handle('set-auto-launch', (_, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true, // 后台启动
    })
    return { ok: true }
  } catch (err) {
    console.error('Failed to set auto-launch:', err)
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('get-auto-launch', () => {
  try {
    const loginItemSettings = app.getLoginItemSettings()
    return { openAtLogin: loginItemSettings.openAtLogin }
  } catch (err) {
    return { openAtLogin: false }
  }
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
