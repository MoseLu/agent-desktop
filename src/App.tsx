import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { Settings, Conversation, Tab, AppMode, ModelOption, ScheduledTask, StoredConversation } from '@types'
import { ThemeProvider, useTheme } from '@contexts/ThemeProvider'
import { ConfigProvider, theme as antdTheme } from 'antd'
import Sidebar from '@layout'
import HomePage from '@pages/HomePage'
import ChatPage from '@pages/ChatPage'
import ScheduledTasksPage from '@pages/ScheduledTasksPage'
import LoginPage from '@pages/LoginPage'
import SettingsModal from '@modals/SettingsModal'
import SearchModal from '@modals/SearchModal'
import { TabBar } from '@components/TabBar'
import { appConfig } from '@config'
import { isElectron, isRealElectron, callElectron } from '@utils/env'

// ─── Conversation serialization helpers ───────────────────────────────────────

function serializeConv(conv: Conversation): StoredConversation {
  return {
    id: conv.id,
    title: conv.title,
    mode: conv.mode ?? 'code',
    smartMode: conv.smartMode ?? false,
    parentId: conv.parentId,
    createdAt: conv.createdAt instanceof Date ? conv.createdAt.toISOString() : String(conv.createdAt),
    messages: conv.messages
      .filter(m => !m.streaming)
      .map(m => ({ role: m.role, content: m.content, error: m.error, events: m.events })),
  }
}

function deserializeConv(record: StoredConversation): Conversation {
  return {
    id: record.id,
    title: record.title,
    mode: record.mode,
    smartMode: record.smartMode,
    parentId: record.parentId,
    createdAt: new Date(record.createdAt),
    messages: record.messages,
  }
}

function AppContent() {
  const [currentUser, setCurrentUser] = useState<string | null | undefined>(undefined) // undefined = loading
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [page, setPage] = useState<'home' | 'chat' | 'scheduled-tasks'>('home')
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])
  const { setTheme } = useTheme()

  // 标签栏状态
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'default', title: appConfig.appName, isDefault: true }])
  const [activeTabId, setActiveTabId] = useState<string>('default')

  // 应用模式：chat（浏览器/桌面均支持）/ code（仅 Electron）
  const [mode, setMode] = useState<AppMode>('chat')

  // Ref 用于延迟保存（避免 closure stale 问题）
  const conversationsRef = useRef<Conversation[]>([])
  useEffect(() => { conversationsRef.current = conversations }, [conversations])
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // 可用模型列表（由后端根据已配置 provider 动态返回，空数组时 ModelSelector 使用自身默认值）
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([])

  const fetchAvailableModels = useCallback(async () => {
    if (!isElectron()) return
    try {
      const models = await window.electron.getAvailableModels()
      if (models.length > 0) {
        setAvailableModels(models)
        // 若当前 model 不在可用列表中，切换到默认值
        setSettings(prev => {
          if (!prev) return prev
          const isValid = models.some(m => m.value === prev.model)
          if (isValid) return prev
          const defaultModel = models[0].value
          window.electron.saveSettings({ model: defaultModel })
          return { ...prev, model: defaultModel }
        })
      }
    } catch (err) {
      console.error('Failed to fetch available models:', err)
    }
  }, [])

  // 从后端加载该用户的历史会话
  const loadConversations = useCallback(async () => {
    if (!isElectron()) return
    try {
      const records = await window.electron.convList()
      setConversations(records.map(deserializeConv))
    } catch (err) {
      console.error('加载会话历史失败:', err)
    }
  }, [])

  // 延迟保存单条会话（防抖 800ms，避免流式更新时频繁写盘）
  const scheduleConvSave = useCallback((id: string) => {
    if (!isElectron()) return
    const existing = saveTimers.current.get(id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      const conv = conversationsRef.current.find(c => c.id === id)
      if (conv && !conv.messages.some(m => m.streaming)) {
        window.electron.convSave(serializeConv(conv)).catch(console.error)
      }
      saveTimers.current.delete(id)
    }, 800)
    saveTimers.current.set(id, timer)
  }, [])

  useEffect(() => {
    // 使用环境变量检测并获取设置
    if (!isElectron()) {
      console.warn('未在 Electron 环境中运行，使用本地存储数据')
      try {
        const stored = localStorage.getItem('app-settings')
        const savedSettings = stored ? JSON.parse(stored) : null

        const defaultSettings: Settings = {
          apiKey: '',
          workspace: '',
          model: 'qwen3-coder-next',
          maxSteps: 10,
          userName: '开发者',
          userPlan: 'free',
          userAvatar: '',
          theme: 'system',
          language: 'zh-CN',
          autoOpenTask: false,
          desktopNotifications: false,
          taskCompleteNotify: false,
          soundNotify: false,
          showInMenuBar: true,
          autoStart: false,
          shortcut: 'Alt+A',
        }

        const settings = savedSettings
          ? { ...defaultSettings, ...savedSettings }
          : defaultSettings

        setSettings(settings)
        setTheme(settings.theme || 'system')
      } catch (err) {
        console.error('Failed to load settings from localStorage:', err)
        const defaultSettings: Settings = {
          apiKey: '',
          workspace: '',
          model: 'qwen3-coder-next',
          maxSteps: 10,
          userName: '开发者',
          userPlan: 'free',
          userAvatar: '',
          theme: 'system',
          language: 'zh-CN',
          autoOpenTask: false,
          desktopNotifications: false,
          taskCompleteNotify: false,
          soundNotify: false,
          showInMenuBar: true,
          autoStart: false,
          shortcut: 'Alt+A',
        }
        setSettings(defaultSettings)
        setTheme('system')
      }
      // 浏览器模式：检查 mock auth
      window.electron.authCheck().then(({ userName }) => {
        setCurrentUser(userName ?? '开发者')
      }).catch(() => setCurrentUser('开发者'))
      // 浏览器模式：加载 mock 历史
      window.electron.convList().then(records => {
        setConversations(records.map(deserializeConv))
      }).catch(() => {})
      return
    }

    // Electron 模式：先检查 auth
    window.electron.authCheck().then(async ({ userName }) => {
      setCurrentUser(userName)
      if (!userName) return  // 未登录，显示 LoginPage

      // 登录后加载设置
      const s = await callElectron(() => window.electron.getSettings(), undefined)
      if (s) {
        setSettings(s)
        setTheme(s.theme || 'system')
      }
      fetchAvailableModels()
      await loadConversations()
    }).catch(err => {
      console.error('Auth check failed:', err)
      setCurrentUser(null)
    })

    // 监听工作目录变化事件
    const handleWorkspaceChanged = (event: CustomEvent<string>) => {
      const newWorkspace = event.detail
      setSettings(prev => prev ? { ...prev, workspace: newWorkspace } : prev)
    }

    window.addEventListener('workspace-changed', handleWorkspaceChanged as EventListener)

    return () => {
      window.removeEventListener('workspace-changed', handleWorkspaceChanged as EventListener)
    }
  }, [])

  const activeConv = conversations.find(c => c.id === activeId) ?? null

  // 选择对话（处理标签创建或切换）
  const selectConversation = useCallback((convId: string) => {
    const conv = conversations.find(c => c.id === convId)
    if (!conv) return

    // 检查该对话是否已有关联的 tab 且该 tab 仍存在
    const existingTab = conv.tabId ? tabs.find(t => t.id === conv.tabId) : null
    if (existingTab) {
      // tab 仍存在，直接切换
      setActiveTabId(existingTab.id)
      setActiveId(convId)
      setPage('chat')
    } else {
      // tab 不存在或已关闭，创建新 tab 并关联
      const tabId = `tab-${Date.now()}`
      const newTab: Tab = {
        id: tabId,
        title: conv.title,
        conversationId: convId,
        isDefault: false,
      }
      setTabs(prev => [...prev, newTab])
      setActiveTabId(tabId)
      setActiveId(convId)
      setPage('chat')
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, tabId } : c
      ))
    }
  }, [conversations, tabs])

  // 关闭标签
  const closeTab = useCallback((tabId: string) => {
    // 默认标签不能关闭
    const tab = tabs.find(t => t.id === tabId)
    if (!tab || tab.isDefault) return

    // 如果关闭的是当前激活的 tab，切换到相邻 tab（优先左侧）
    if (activeTabId === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId)
      const idx = tabs.findIndex(t => t.id === tabId)
      const next = remaining[Math.max(0, idx - 1)] ?? remaining[0]
      if (next) {
        if (next.conversationId) {
          setActiveId(next.conversationId)
          setPage('chat')
        } else {
          setActiveId(null)
          setPage('home')
        }
        setActiveTabId(next.id)
      }
    }

    // 删除 tab，保留对话记录（清除 tabId 引用使其可从侧边栏重新打开）
    setTabs(prev => prev.filter(t => t.id !== tabId))
    if (tab.conversationId) {
      setConversations(prev => prev.map(c =>
        c.id === tab.conversationId ? { ...c, tabId: undefined } : c
      ))
    }
  }, [tabs, activeTabId])

  // 切换标签
  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)
    
    const tab = tabs.find(t => t.id === tabId)
    if (tab?.conversationId) {
      // 有关联的对话，切换到该对话
      setActiveId(tab.conversationId)
      setPage('chat')
    } else {
      // 默认标签，回到首页
      setActiveId(null)
      setPage('home')
    }
  }, [tabs])

  // 创建新标签（首页）— 用于顶栏 + 按钮，始终新建
  const createNewTab = useCallback(() => {
    const tabId = `tab-${Date.now()}`
    const newTab: Tab = {
      id: tabId,
      title: appConfig.appName,
      isDefault: false,
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(tabId)
    setActiveId(null)
    setPage('home')
  }, [])

  // 侧边栏「新建任务」— 有空白 tab 则跳转，否则新建
  const handleSidebarNewTask = useCallback(() => {
    const emptyTab = tabs.find(t => !t.conversationId)
    if (emptyTab) {
      setActiveTabId(emptyTab.id)
      setActiveId(null)
      setPage('home')
    } else {
      createNewTab()
    }
  }, [tabs, createNewTab])

  // 登录
  const handleLogin = useCallback(async (userName: string) => {
    if (isElectron()) {
      await window.electron.authLogin(userName)
      // 获取账号信息，同步头像到设置
      try {
        const account = await window.electron.getAccountInfo(userName)
        if (account?.userAvatar) {
          await window.electron.saveSettings({ userAvatar: account.userAvatar })
        }
      } catch (err) {
        console.error('Failed to get account info:', err)
      }
    }
    setCurrentUser(userName)
    // 加载设置和会话
    if (isElectron()) {
      const s = await callElectron(() => window.electron.getSettings(), undefined)
      if (s) { setSettings(s); setTheme(s.theme || 'system') }
      fetchAvailableModels()
      await loadConversations()
    }
  }, [loadConversations, fetchAvailableModels, setTheme])

  // 退出登录
  const handleLogout = useCallback(async () => {
    if (isElectron()) {
      await window.electron.authLogout()
    }
    setCurrentUser(null)
    setConversations([])
    setActiveId(null)
    setPage('home')
    setTabs([{ id: 'default', title: appConfig.appName, isDefault: true }])
    setActiveTabId('default')
  }, [])

  // 只有当用户输入了内容时才创建新任务
  const startNewTask = useCallback((initialPrompt?: string, smartMode?: boolean) => {
    if (!initialPrompt || !initialPrompt.trim()) {
      return null
    }

    const id = Date.now().toString()
    const conv: Conversation = {
      id,
      title: initialPrompt.slice(0, 30),
      messages: [{ role: 'user', content: initialPrompt }],
      createdAt: new Date(),
      smartMode: smartMode ?? false,
      mode,
    }
    setConversations(prev => [conv, ...prev])
    setActiveId(id)
    // 不自动跳转，让用户手动进入会话页面

    // 立即保存到后端
    if (isElectron()) {
      window.electron.convSave(serializeConv(conv)).catch(console.error)
    }

    // 检查当前 tab 是否是空的（没有关联对话）
    const currentTab = tabs.find(t => t.id === activeTabId)
    if (currentTab && !currentTab.conversationId) {
      const updatedTab: Tab = { ...currentTab, title: conv.title, conversationId: id }
      setTabs(prev => prev.map(t => t.id === activeTabId ? updatedTab : t))
      setActiveTabId(activeTabId)
      setConversations(prev => prev.map(c => c.id === id ? { ...c, tabId: activeTabId } : c))
    } else {
      const tabId = `tab-${Date.now()}`
      const newTab: Tab = { id: tabId, title: conv.title, conversationId: id, isDefault: false }
      setTabs(prev => [...prev, newTab])
      setActiveTabId(tabId)
      setConversations(prev => prev.map(c => c.id === id ? { ...c, tabId } : c))
    }

    return { id, initialPrompt }
  }, [tabs, activeTabId, mode])

  const updateConv = useCallback((id: string, updater: (c: Conversation) => Partial<Conversation>) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, ...updater(c) } : c))
    scheduleConvSave(id)
  }, [scheduleConvSave])

  // 获取同一分支树的所有会话（找到根节点后递归收集所有子节点）
  const getBranchFamily = useCallback((convId: string): Conversation[] => {
    let rootId = convId
    let current = conversations.find(c => c.id === convId)
    while (current?.parentId) {
      rootId = current.parentId
      current = conversations.find(c => c.id === current!.parentId)
    }
    const result: Conversation[] = []
    function collect(id: string) {
      const conv = conversations.find(c => c.id === id)
      if (conv) result.push(conv)
      conversations.filter(c => c.parentId === id).forEach(c => collect(c.id))
    }
    collect(rootId)
    return result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }, [conversations])

  // 从当前会话创建分支会话（子会话，不新建全局 Tab，仅在 ChatPage 内的 tab 栏展示）
  const createBranch = useCallback((fromConversationId: string) => {
    const fromConv = conversations.find(c => c.id === fromConversationId)
    if (!fromConv) return

    const id = `branch-${Date.now()}`
    const branchConv: Conversation = {
      id,
      title: `${fromConv.title} · 子会话`,
      messages: fromConv.messages.filter(m => !m.streaming).map(m => ({ ...m })),
      createdAt: new Date(),
      parentId: fromConversationId,
      smartMode: fromConv.smartMode,
      mode: fromConv.mode,  // 继承根会话的 mode
    }
    setConversations(prev => [...prev, branchConv])
    setActiveId(id)
    setPage('chat')
    // 立即持久化分支
    if (isElectron()) {
      window.electron.convSave(serializeConv(branchConv)).catch(console.error)
    }
  }, [conversations])

  // 切换到某个子会话（不修改全局 tab，只改 activeId）
  const switchBranch = useCallback((convId: string) => {
    setActiveId(convId)
    setPage('chat')
  }, [])

  const deleteConv = (id: string) => {
    // 递归收集该会话及其所有子分支的 ID
    const collectTree = (rootId: string, all: Conversation[]): string[] => {
      const ids = [rootId]
      all.filter(c => c.parentId === rootId).forEach(c => ids.push(...collectTree(c.id, all)))
      return ids
    }
    const toDelete = collectTree(id, conversations)

    setConversations(prev => prev.filter(c => !toDelete.includes(c.id)))
    if (activeId && toDelete.includes(activeId)) {
      setActiveId(null)
      setPage('home')
    }
    if (isElectron()) {
      toDelete.forEach(delId => window.electron.convDelete(delId).catch(console.error))
    }
  }

  const renameConv = useCallback((id: string, newTitle: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c))
    setTabs(prev => prev.map(t => t.conversationId === id ? { ...t, title: newTitle } : t))
    scheduleConvSave(id)
  }, [scheduleConvSave])

  const addScheduledTask = useCallback((data: Omit<ScheduledTask, 'id' | 'createdAt'>) => {
    const task: ScheduledTask = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date(),
    }
    setScheduledTasks(prev => [task, ...prev])
  }, [])

  const goHome = () => { setActiveId(null); setPage('home') }

  // 启动中（auth 状态未知）
  if (currentUser === undefined) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-tertiary)', fontSize: 14 }}>
        加载中...
      </div>
    )
  }

  // 未登录 → 显示登录页
  if (currentUser === null) {
    return <LoginPage onLogin={handleLogin} />
  }

  // settings 尚未加载（已登录但 settings 还在请求中）
  if (!settings) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-tertiary)', fontSize: 14 }}>
        加载中...
      </div>
    )
  }

  return (
    <div style={styles.root}>
      {/* 全局顶部标签栏 */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={switchTab}
        onClose={closeTab}
        onNewTab={createNewTab}
        mode={mode}
        onModeChange={setMode}
        isRealElectron={isRealElectron()}
      />

      <div style={styles.contentWrapper}>
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          settings={settings}
          onHome={goHome}
          onSelect={selectConversation}
          onNewTask={handleSidebarNewTask}
          onDelete={deleteConv}
          onRename={renameConv}
          onLogout={handleLogout}
          onSettings={() => setShowSettings(true)}
          onSearch={() => setShowSearch(true)}
          onScheduledTasks={() => { setPage('scheduled-tasks'); setActiveId(null) }}
        />

        <main style={styles.main}>
          {page === 'scheduled-tasks' ? (
            <ScheduledTasksPage
            onBack={goHome}
            tasks={scheduledTasks}
            onAddTask={addScheduledTask}
          />
          ) : page === 'chat' && activeConv ? (
            <ChatPage
              key={activeId!}
              conversation={activeConv}
              settings={settings}
              mode={mode}
              availableModels={availableModels}
              onUpdate={(updater) => updateConv(activeId!, updater)}
              onSettingsChange={(s) => setSettings({ ...settings, ...s })}
              branchConversations={getBranchFamily(activeId!)}
              onCreateBranch={() => createBranch(activeId!)}
              onSwitchBranch={switchBranch}
            />
          ) : (
            <HomePage
              settings={settings}
              availableModels={availableModels}
              onSettingsChange={(s) => setSettings({ ...settings, ...s })}
              onStartTask={(prompt, smartMode) => {
                startNewTask(prompt, smartMode)
              }}
            />
          )}
        </main>
      </div>

      {showSettings && (
        <SettingsModal
          initial={settings}
          onSave={async (s) => {
            if (s.theme) setTheme(s.theme)
            setSettings({ ...settings, ...s })
          }}
          onClose={() => {
            setShowSettings(false)
            // 代理配置可能已变更，重新拉取可用模型
            fetchAvailableModels()
          }}
          onScheduledTasks={() => { setShowSettings(false); setPage('scheduled-tasks'); setActiveId(null) }}
        />
      )}

      {showSearch && (
        <SearchModal
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setPage('chat') }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}

// antd token 映射 — 与 CSS design token 同步，避免两套系统割裂
const ANTD_LIGHT_TOKENS = {
  colorPrimary: '#1a1a1a',
  colorBgBase: '#ffffff',
  colorTextBase: '#1a1a1a',
  colorBorder: '#e8e8e8',
  colorBorderSecondary: '#efefef',
  colorError: '#f44336',
  colorSuccess: '#4caf50',
  colorWarning: '#ff9800',
  colorInfo: '#42a5f5',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgLayout: '#fafafa',
  colorText: '#1a1a1a',
  colorTextSecondary: '#666666',
  colorTextTertiary: '#999999',
  colorTextQuaternary: '#cccccc',
  colorFill: 'rgba(0,0,0,0.06)',
  colorFillSecondary: 'rgba(0,0,0,0.04)',
  borderRadius: 8,
  borderRadiusSM: 4,
  borderRadiusLG: 12,
  controlHeight: 32,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'Microsoft YaHei', sans-serif",
  fontSize: 14,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.1)',
  motionDurationMid: '0.15s',
  motionDurationSlow: '0.2s',
}

const ANTD_DARK_TOKENS = {
  colorPrimary: '#ffffff',
  colorBgBase: '#1c1c1c',
  colorTextBase: '#e5e5e5',
  colorBorder: '#404040',
  colorBorderSecondary: '#333333',
  colorError: '#ef5350',
  colorSuccess: '#66bb6a',
  colorWarning: '#ffa726',
  colorInfo: '#42a5f5',
  colorBgContainer: '#262626',
  colorBgElevated: '#262626',
  colorBgLayout: '#171717',
  colorText: '#e5e5e5',
  colorTextSecondary: '#cccccc',
  colorTextTertiary: '#a0a0a0',
  colorTextQuaternary: '#707070',
  colorFill: 'rgba(255,255,255,0.08)',
  colorFillSecondary: 'rgba(255,255,255,0.04)',
  borderRadius: 8,
  borderRadiusSM: 4,
  borderRadiusLG: 12,
  controlHeight: 32,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'Microsoft YaHei', sans-serif",
  fontSize: 14,
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.4)',
  motionDurationMid: '0.15s',
  motionDurationSlow: '0.2s',
}

function AppWithAntd() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const themeConfig = {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: isDark ? ANTD_DARK_TOKENS : ANTD_LIGHT_TOKENS,
    components: {
      Dropdown: {
        paddingBlock: 5,
      },
    },
  }

  return (
    <ConfigProvider theme={themeConfig}>
      <AppContent />
    </ConfigProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <AppWithAntd />
    </ThemeProvider>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'var(--bg-primary)',
    overflow: 'hidden',
  },
  contentWrapper: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
}
