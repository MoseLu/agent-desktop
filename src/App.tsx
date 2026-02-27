import React, { useState, useEffect, useCallback } from 'react'
import type { Settings, Conversation, Message, Tab } from '@types'
import { ThemeProvider, useTheme } from '@contexts/ThemeProvider'
import { ConfigProvider } from 'antd'
import Sidebar from '@layout'
import HomePage from '@pages/HomePage'
import ChatPage from '@pages/ChatPage'
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
  const [page, setPage] = useState<'home' | 'chat'>('home')
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

    // 检查该对话是否已有关联的 tab
    if (conv.tabId) {
      // 已存在，直接切换到该 tab
      setActiveTabId(conv.tabId)
      setActiveId(convId)
      setPage('chat')
    } else {
      // 不存在，创建新 tab 并关联
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
      // 更新对话的 tabId
      setConversations(prev => prev.map(c => 
        c.id === convId ? { ...c, tabId } : c
      ))
    }
  }, [conversations])

  // 关闭标签
  const closeTab = useCallback((tabId: string) => {
    // 默认标签不能关闭
    const tab = tabs.find(t => t.id === tabId)
    if (!tab || tab.isDefault) return

    // 如果关闭的是当前激活的 tab，切换到默认标签
    if (activeTabId === tabId) {
      setActiveTabId('default')
      setActiveId(null)
      setPage('home')
    }

    // 删除 tab
    setTabs(prev => prev.filter(t => t.id !== tabId))

    // 删除关联的对话
    if (tab.conversationId) {
      setConversations(prev => prev.filter(c => c.id !== tab.conversationId))
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

  // 创建新标签（首页）
  const createNewTab = useCallback(() => {
    const tabId = `tab-${Date.now()}`
    const newTab: Tab = {
      id: tabId,
      title: appConfig.appName, // 使用应用名称作为默认标题
      isDefault: false,
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(tabId)
    setActiveId(null)
    setPage('home')
  }, [])

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
          onNewTask={createNewTab} // 点击新建任务按钮创建新标签
          onDelete={deleteConv}
          onSettings={() => setShowSettings(true)}
          onSearch={() => setShowSearch(true)}
        />

        <main style={styles.main}>
          {page === 'home' || !activeConv ? (
            <HomePage
              settings={settings}
              onStartTask={(prompt) => {
                const result = startNewTask(prompt)
                if (result) {
                  // 任务已创建并切换到聊天页面
                }
              }}
            />
          ) : (
            <ChatPage
              key={activeId!}
              conversation={activeConv}
              settings={settings}
              onUpdate={(updater) => updateConv(activeId!, updater)}
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

function AppWithAntd() {
  // antd 主题配置（适配当前设计令牌）
  const antdTheme = {
    token: {
      borderRadius: 6,
      controlHeight: 32,
    },
  }

  return (
    <ConfigProvider theme={antdTheme}>
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
