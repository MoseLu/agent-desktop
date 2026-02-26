import React, { useState, useEffect, useCallback } from 'react'
import type { Settings, Conversation, Message } from './types'
import Sidebar from './components/Sidebar'
import HomePage from './components/HomePage'
import ChatPage from './components/ChatPage'
import SettingsModal from './components/SettingsModal'

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [page, setPage] = useState<'home' | 'chat'>('home')

  useEffect(() => {
    window.electron.getSettings().then(s => {
      setSettings(s)
      if (!s.apiKey) setShowSettings(true)
    })
  }, [])

  const activeConv = conversations.find(c => c.id === activeId) ?? null

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
    return { id, initialPrompt }
  }, [])

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
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#999', fontSize: 14 }}>
        加载中...
      </div>
    )
  }

  return (
    <div style={styles.root}>
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        settings={settings}
        onHome={goHome}
        onSelect={(id) => { setActiveId(id); setPage('chat') }}
        onNewTask={() => {}} // 在 HomePage 中处理，需要输入内容后才创建
        onDelete={deleteConv}
        onSettings={() => setShowSettings(true)}
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

      {showSettings && (
        <SettingsModal
          initial={settings}
          onSave={async (s) => {
            await window.electron.saveSettings(s)
            setSettings({ ...settings, ...s })
            setShowSettings(false)
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    height: '100vh',
    background: '#fff',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
}
