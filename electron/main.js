const { app, BrowserWindow, ipcMain, shell, dialog, globalShortcut, Menu } = require('electron')
const path = require('path')
const AgentService = require('./agent/service')
const { AgentHub } = require('./agent/agent-hub')

// electron-store 是 ESM 模块，需要动态导入
let Store
let store
let agentHub
const isDev = !app.isPackaged

// 配置 CCSwith 代理（如果启用）
function configureCCSwithProxy() {
  const useCCSwith = process.env.USE_CCSWITH === 'true' || process.argv.includes('--ccswitch')
  
  if (useCCSwith) {
    const proxyServer = process.env.CCSWITH_PROXY || '127.0.0.1:8888'
    console.log(`[Main] 🔄 启用 CCSwith 代理：${proxyServer}`)
    
    // 配置 Electron 使用代理
    app.commandLine.appendSwitch('proxy-server', proxyServer)
    
    // 配置 bypass 规则（本地地址不走代理）
    app.commandLine.appendSwitch('proxy-bypass-rules', 'localhost,127.0.0.1,<local>')
    
    console.log('[Main] ✅ CCSwith 代理配置成功')
  }
}

// 启动时配置代理
configureCCSwithProxy()

async function initStore() {
  Store = (await import('electron-store')).default
  store = new Store()
  agentService = new AgentService(store)
  agentHub = new AgentHub()
  
  // 初始化时检查可用的 Agent
  checkAvailableAgents()
}

// 检查并注册可用的 Agent
async function checkAvailableAgents() {
  const apiKeys = {
    minimax: store.get('apiKey', ''),
    qwen: store.get('qwenApiKey', ''),
    claude: store.get('claudeApiKey', ''),
    openai: store.get('openaiApiKey', ''),
  }
  
  const model = store.get('model', '')
  
  // 根据当前选择的模型注册对应的 Agent
  if (model) {
    const apiKey = apiKeys.minimax || apiKeys.qwen || apiKeys.claude || apiKeys.openai
    if (apiKey) {
      try {
        const adapter = agentHub.getAdapter(model, apiKey)
        const available = await adapter.isAvailable()
        console.log(`[Main] Agent ${model} 可用性：${available ? '✅' : '❌'}`)
      } catch (error) {
        console.warn(`[Main] 初始化 Agent ${model} 失败:`, error.message)
      }
    }
  }
}

// 移除默认菜单栏
function removeDefaultMenu() {
  Menu.setApplicationMenu(null)
}

let mainWindow
let agentService

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
  agentService?.stopAll()
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
ipcMain.handle('agent-run', (_, { conversationId, messages, workspace }) =>
  agentService.run(
    conversationId,
    { messages, workspace },
    (ev) => mainWindow?.webContents.send('agent-event', ev),
  )
)

ipcMain.handle('agent-stop', (_, conversationId) => {
  agentService.stop(conversationId)
  return { ok: true }
})

// ─── Agent Hub (新增多 Agent 支持) ────────────────────────────────────────────

// 检查可用的 Agent
ipcMain.handle('agent:check-available', async () => {
  const apiKeys = {
    minimax: store.get('apiKey', ''),
    qwen: store.get('qwenApiKey', ''),
    claude: store.get('claudeApiKey', ''),
    openai: store.get('openaiApiKey', ''),
  }
  
  const available = []
  for (const [name, apiKey] of Object.entries(apiKeys)) {
    if (!apiKey) continue
    
    try {
      const modelName = name === 'minimax' ? 'MiniMax-M2.5' 
        : name === 'qwen' ? 'qwen3-coder-next'
        : name === 'claude' ? 'claude-sonnet-4-20250514'
        : 'gpt-4-turbo'
      
      if (await agentHub.checkAvailability(modelName, apiKey)) {
        available.push(name)
      }
    } catch (error) {
      console.warn(`[Main] 检查 ${name} 失败:`, error.message)
    }
  }
  
  return available
})

// 测试指定 Agent
ipcMain.handle('agent:test', async (_, { model, apiKey }) => {
  try {
    const adapter = agentHub.getAdapter(model, apiKey)
    const response = await adapter.chat({
      messages: [{ role: 'user', content: '你好，请用一句话介绍自己' }],
      maxTokens: 100,
    })
    return { 
      success: true, 
      content: response.content,
      usage: response.usage,
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 智能选择最佳 Agent
ipcMain.handle('agent:select-best', async () => {
  const apiKeys = {
    minimax: store.get('apiKey', ''),
    qwen: store.get('qwenApiKey', ''),
    claude: store.get('claudeApiKey', ''),
    openai: store.get('openaiApiKey', ''),
  }
  
  // 过滤掉空的 API Key
  const validKeys = {}
  for (const [key, value] of Object.entries(apiKeys)) {
    if (value) validKeys[key] = value
  }
  
  try {
    const bestAgent = await agentHub.selectBestAgent(
      { messages: [{ role: 'user', content: 'test' }] },
      validKeys
    )
    return { success: true, agent: bestAgent }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

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

ipcMain.handle('open-external', (_, url) => shell.openExternal(url))

// ─── Chat Message Proxy (bypasses renderer CORS) ──────────────────────────────
ipcMain.handle('chat-message', async (_, { provider, apiKey, model, messages }) => {
  try {
    let url, headers, body

    if (provider === 'minimax') {
      url = 'https://api.minimaxi.com/anthropic/v1/messages'
      headers = {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      }
      body = JSON.stringify({
        model,
        max_tokens: 8096,
        messages: messages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content })),
      })
    } else if (provider === 'qwen') {
      url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
      body = JSON.stringify({ model, messages })
    } else {
      return { ok: false, error: `Unsupported provider: ${provider}` }
    }

    const res = await fetch(url, { method: 'POST', headers, body })
    const data = await res.json()
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})
