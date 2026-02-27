import React, { useState, useEffect, useCallback } from 'react'
import type { Settings, Conversation, Message, Tab } from '@types'
import { ThemeProvider, useTheme } from '@contexts/ThemeProvider'
import { ConfigProvider, theme as antdTheme } from 'antd'
import Sidebar from '@layout'
import HomePage from '@pages/HomePage'
import ChatPage from '@pages/ChatPage'
import ScheduledTasksPage from '@pages/ScheduledTasksPage'
import SettingsModal from '@modals/SettingsModal'
import SearchModal from '@modals/SearchModal'
import { TabBar } from '@components/TabBar'
import { appConfig } from '@config'
import { isElectron, callElectron } from '@utils/env'

function AppContent() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [page, setPage] = useState<'home' | 'chat' | 'scheduled-tasks'>('home')
  const { setTheme } = useTheme()

  // 标签栏状态
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'default', title: appConfig.appName, isDefault: true }])
  const [activeTabId, setActiveTabId] = useState<string>('default')

  useEffect(() => {
    // 使用环境变量检测并获取设置
    if (!isElectron()) {
      console.warn('未在 Electron 环境中运行，使用模拟数据')
      // 在浏览器开发模式下使用模拟数据
      const mockSettings: Settings = {
        apiKey: '',
        workspace: '',
        model: 'qwen3-coder-next',
        maxSteps: 10,
        userName: '开发者',
        userPlan: 'free',
        theme: 'system',
        language: 'zh-CN',
        autoOpenTask: false,
        desktopNotifications: false,
        taskCompleteNotify: false,
        soundNotify: false,
      }
      setSettings(mockSettings)
      setTheme('system')
      return
    }

    // 在 Electron 环境中获取设置
    callElectron(() => window.electron.getSettings(), undefined)
      .then(s => {
        if (s) {
          setSettings(s)
          // 初始化主题
          setTheme(s.theme || 'system')
        }
      })
      .catch(err => {
        console.error('获取设置失败:', err)
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

  // 只有当用户输入了内容时才创建新任务
  const startNewTask = useCallback((initialPrompt?: string) => {
    // 如果没有初始提示，不创建任务（从 HomePage 的输入框提交时会传递内容）
    if (!initialPrompt || !initialPrompt.trim()) {
      return null
    }

    const id = Date.now().toString()
    const conv: Conversation = {
      id,
      title: initialPrompt.slice(0, 30),
      messages: [{ role: 'user', content: initialPrompt }],
      createdAt: new Date(),
    }
    setConversations(prev => [conv, ...prev])
    setActiveId(id)
    setPage('chat')
    
    // 检查当前 tab 是否是空的（没有关联对话）
    const currentTab = tabs.find(t => t.id === activeTabId)
    if (currentTab && !currentTab.conversationId) {
      // 当前 tab 是空的，直接更新它
      const updatedTab: Tab = {
        ...currentTab,
        title: conv.title,
        conversationId: id,
      }
      setTabs(prev => prev.map(t => t.id === activeTabId ? updatedTab : t))
      setActiveTabId(activeTabId)
      // 更新对话的 tabId
      setConversations(prev => prev.map(c => 
        c.id === id ? { ...c, tabId: activeTabId } : c
      ))
    } else {
      // 当前 tab 有关联对话或没有激活的 tab，创建新标签
      const tabId = `tab-${Date.now()}`
      const newTab: Tab = {
        id: tabId,
        title: conv.title,
        conversationId: id,
        isDefault: false,
      }
      setTabs(prev => [...prev, newTab])
      setActiveTabId(tabId)
      // 更新对话的 tabId
      setConversations(prev => prev.map(c => 
        c.id === id ? { ...c, tabId } : c
      ))
    }
    
    return { id, initialPrompt }
  }, [tabs, activeTabId])

  const updateConv = useCallback((id: string, updater: (c: Conversation) => Partial<Conversation>) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, ...updater(c) } : c))
  }, [])

  const deleteConv = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) {
      setActiveId(null)
      setPage('home')
    }
  }

  const goHome = () => { setActiveId(null); setPage('home') }

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
          onSettings={() => setShowSettings(true)}
          onSearch={() => setShowSearch(true)}
          onScheduledTasks={() => { setPage('scheduled-tasks'); setActiveId(null) }}
        />

        <main style={styles.main}>
          {page === 'scheduled-tasks' ? (
            <ScheduledTasksPage onBack={goHome} />
          ) : page === 'chat' && activeConv ? (
            <ChatPage
              key={activeId!}
              conversation={activeConv}
              settings={settings}
              onUpdate={(updater) => updateConv(activeId!, updater)}
            />
          ) : (
            <HomePage
              settings={settings}
              onStartTask={(prompt) => {
                const result = startNewTask(prompt)
                if (result) {
                  // 任务已创建并切换到聊天页面
                }
              }}
            />
          )}
        </main>
      </div>

      {showSettings && (
        <SettingsModal
          initial={settings}
          onSave={async (s) => {
            // 设置已自动保存，这里只需要更新本地状态
            setSettings({ ...settings, ...s })
            // 如果是主题变化，更新 ThemeProvider
            if (s.theme) {
              setTheme(s.theme)
            }
          }}
          onClose={() => setShowSettings(false)}
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
