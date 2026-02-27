import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Settings, Conversation, Message, AgentEvent, ToolEvent } from '@types'
import IconButton from '@ui/IconButton'
import Tooltip from '@ui/Tooltip'
import ChatInput from '@ui/ChatInput'
import ChatInputToolbar from '@ui/ChatInputToolbar'
import {
  AttachIcon,
  FolderIcon,
  LightningIcon,
  GearIcon,
  OmnipotentModeIcon as OmnipotentIcon,
} from '@ui/icons'
import { ArrowUpOutlined } from '@ant-design/icons'
import { isElectron, callElectron } from '@utils/env'

interface Props {
  conversation: Conversation
  settings: Settings
  onUpdate: (updater: (c: Conversation) => Partial<Conversation>) => void
}

export default function ChatPage({ conversation, settings, onUpdate }: Props) {
  const [input, setInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [isSmartMode, setIsSmartMode] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const messages = conversation.messages

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAgentEvent = useCallback((ev: AgentEvent) => {
    switch (ev.type) {
      case 'step':
        setStatusText(`步骤 ${ev.step} / ${ev.maxSteps}`)
        break
      case 'text':
        onUpdate(conv => {
          const msgs = [...conv.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant' && last.streaming) {
            msgs[msgs.length - 1] = { ...last, content: last.content + (ev.text as string) }
          } else {
            msgs.push({ role: 'assistant', content: ev.text as string, streaming: true, events: [] })
          }
          return { messages: msgs }
        })
        break
      case 'tool_start':
        setStatusText(`执行 ${ev.name}...`)
        onUpdate(conv => {
          const msgs = [...conv.messages]
          const last = msgs[msgs.length - 1]
          const toolEv: ToolEvent = { type: 'tool_start', id: ev.id as string, name: ev.name as string, input: ev.input as Record<string, unknown> }
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, events: [...(last.events ?? []), toolEv] }
          } else {
            msgs.push({ role: 'assistant', content: '', streaming: true, events: [toolEv] })
          }
          return { messages: msgs }
        })
        break
      case 'tool_result':
        onUpdate(conv => {
          const msgs = [...conv.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant') {
            const events = (last.events ?? []).map(e =>
              e.id === ev.id ? { ...e, type: 'tool_result' as const, result: ev.result as Record<string, unknown>, duration: ev.duration as number, isError: ev.isError as boolean } : e
            )
            msgs[msgs.length - 1] = { ...last, events }
          }
          return { messages: msgs }
        })
        break
      case 'done':
        setIsRunning(false)
        setStatusText('')
        onUpdate(conv => {
          const msgs = [...conv.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant') msgs[msgs.length - 1] = { ...last, streaming: false }
          const firstUser = msgs.find(m => m.role === 'user')
          return { messages: msgs, title: firstUser?.content.slice(0, 30) ?? '任务' }
        })
        break
      case 'error':
        setIsRunning(false)
        setStatusText('')
        break
      case 'stopped':
        setIsRunning(false)
        setStatusText('')
        break
    }
  }, [onUpdate])

  useEffect(() => {
    if (!isElectron()) {
      // 浏览器模式下不注册事件监听器
      return
    }
    
    const cleanup = window.electron.onAgentEvent(handleAgentEvent)
    cleanupRef.current = cleanup
    return () => cleanup()
  }, [handleAgentEvent])

  const sendMessage = async (content = input.trim()) => {
    if (!content || isRunning) return
    setInput('')
    setIsRunning(true)
    setStatusText('思考中...')

    const userMsg: Message = { role: 'user', content }
    const updated = [...messages, userMsg]
    onUpdate(() => ({ messages: updated }))

    if (messages.length === 0) {
      onUpdate(() => ({ title: content.slice(0, 30) }))
    }

    if (!isElectron()) {
      console.log('[Browser Mode] Agent run not available')
      setIsRunning(false)
      setStatusText('')
      return
    }

    const result = await window.electron.agentRun({
      messages: updated.map(m => ({ role: m.role, content: m.content })),
      workspace: settings.workspace,
    })

    if (result.error) {
      setIsRunning(false)
      setStatusText('')
    }
  }

  const workspaceName = settings.workspace || '未设置工作目录'

  return (
    <div style={styles.page}>
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isRunning && statusText && (
          <div style={styles.statusRow}>
            <ThinkingDots />
            <span style={styles.statusRowText}>{statusText}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={sendMessage}
          placeholder="继续输入任务..."
          disabled={isRunning}
          renderToolbar={() => (
            <ChatInputToolbar
              leftContent={(
                <IconButton 
                  variant="bordered" 
                  icon={<AttachIcon />} 
                  title="上传文件"
                />
              )}
              rightContent={(
                <>
                  {/* 简洁模式：只显示路径和模式，不可更改 */}
                  {isElectron() && (
                    <>
                      <div style={styles.statusItem}>
                        <FolderIcon size={14} />
                        <span style={styles.statusText}>{workspaceName}</span>
                      </div>
                      <div style={styles.divider} />
                    </>
                  )}
                  <div style={styles.modeItem}>
                    {isSmartMode ? (
                      <>
                        <OmnipotentIcon size={16} />
                        <span style={styles.modeText}>全能</span>
                      </>
                    ) : (
                      <>
                        <LightningIcon size={16} />
                        <span style={styles.modeText}>快速</span>
                      </>
                    )}
                  </div>
                  <Tooltip title={input.trim() ? '发送（Enter）' : '请输入内容'} position="top">
                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || isRunning}
                      style={{
                        ...styles.sendBtn,
                        ...(input.trim() && !isRunning ? styles.sendBtnActive : styles.sendBtnDisabled),
                      }}
                    >
                      <ArrowUpOutlined style={{ fontSize: 18 }} />
                    </button>
                  </Tooltip>
                </>
              )}
            />
          )}
        />
      </div>
    </div>
  )
}
// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div style={msgStyles.userRow}>
        <div style={msgStyles.userBubble}>
          <p style={msgStyles.userText}>{message.content}</p>
        </div>
      </div>
    )
  }
  return (
    <div style={msgStyles.assistantRow}>
      <div style={msgStyles.avatar}><AvatarIcon /></div>
      <div style={msgStyles.assistantContent}>
        {message.events?.map((ev, i) => <ToolBlock key={i} event={ev} />)}
        {message.content && (
          <div style={msgStyles.text}>
            <SimpleMarkdown text={message.content} />
            {message.streaming && <span style={msgStyles.cursor}>▌</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function ToolBlock({ event }: { event: ToolEvent }) {
  const [open, setOpen] = useState(false)
  const isDone = event.type === 'tool_result'
  const color = '#888'

  return (
    <div style={toolStyles.block}>
      <button style={{ ...toolStyles.header, borderLeftColor: color }} onClick={() => setOpen(p => !p)}>
        <span style={toolStyles.icon}>🔧</span>
        <span style={{ ...toolStyles.name, color }}>{event.name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {isDone && !event.isError && <CheckMark color={color} />}
          <MiniChevron open={open} />
        </div>
      </button>
      {open && (
        <div style={toolStyles.body}>
          {event.input && (
            <div style={toolStyles.section}>
              <span style={toolStyles.sectionLabel}>INPUT</span>
              <pre style={toolStyles.code}>{JSON.stringify(event.input, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
        return <p key={i} style={mdStyles.p}>{line}</p>
      })}
    </div>
  )
}

function ThinkingDots() {
  return (
    <span style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#999',
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          display: 'inline-block',
        }} />
      ))}
    </span>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function AvatarIcon() {
  return (
    <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7 L5 4 L8 7 L5 10Z" fill="var(--bg-primary)" opacity="0.9" />
        <path d="M6 7 L9 4 L12 7 L9 10Z" fill="var(--bg-primary)" opacity="0.5" />
      </svg>
    </div>
  )
}

function CheckMark({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color }}>
      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MiniChevron({ open }: { open: boolean }) {
  return (
    <svg 
      width="12" 
      height="12" 
      viewBox="0 0 12 12" 
      fill="none"
      style={{ 
        transform: `rotate(${open ? '180deg' : '0deg'}`,
        transition: 'transform 0.2s ease',
      }}
    >
      <path d="M3 4L6 7L9 4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' },
  messages: { flex: 1, overflowY: 'auto', padding: '24px 0' },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 40px', color: 'var(--text-tertiary)' },
  statusRowText: { fontSize: 12 },
  inputArea: { padding: '12px 24px 20px', borderTop: '1px solid var(--border-light)' },
  modeSwitcher: {
    display: 'flex',
    border: '1px solid var(--border-medium)',
    borderRadius: 8,
    background: 'transparent',
    padding: 2,
    gap: 2,
  },
  modeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--icon-tertiary)',
    transition: 'all 0.15s ease',
    padding: 0,
  },
  modeBtnActive: {
    background: 'var(--active-bg)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    borderRadius: 10,
  },
  workspacePill: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid var(--border-medium)',
    background: 'transparent',
    cursor: 'pointer',
    marginLeft: 4,
    height: 36,
    minWidth: 150,
    maxWidth: 240,
  },
  workspaceText: { fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  // 简洁状态显示（无背景，垂直分割线）
  statusItem: {
    display: 'flex', alignItems: 'center', gap: 6,
    height: 36,
  },
  statusText: { 
    fontSize: 13, 
    color: 'var(--text-secondary)', 
    overflow: 'hidden', 
    textOverflow: 'ellipsis', 
    whiteSpace: 'nowrap',
    maxWidth: 120,
  },
  modeItem: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: 30,
  },
  modeText: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  divider: {
    width: 1,
    height: 20,
    background: 'var(--border-light)',
    margin: '0 8px',
  },
  modelName: {
    fontSize: 13, 
    color: 'var(--text-secondary)', 
    fontWeight: 500,
    paddingRight: 4,
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: 0,
    flexShrink: 0,
  },
  sendBtnActive: {
    background: 'var(--accent-primary)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
  sendBtnDisabled: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-disabled)',
    cursor: 'not-allowed',
  },
  stopBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-medium)', borderRadius: 8,
    cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'inherit',
  },
}

const msgStyles: Record<string, React.CSSProperties> = {
  userRow: { display: 'flex', justifyContent: 'flex-end', padding: '6px 32px' },
  userBubble: { maxWidth: '70%', background: 'var(--bg-secondary)', borderRadius: '14px 14px 4px 14px', padding: '11px 15px' },
  userText: { fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65 },
  assistantRow: { display: 'flex', gap: 11, padding: '6px 32px', alignItems: 'flex-start' },
  avatar: { marginTop: 1, flexShrink: 0 },
  assistantContent: { flex: 1, minWidth: 0 },
  text: { fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 },
  cursor: { color: 'var(--text-tertiary)', animation: 'blink 1s step-end infinite' },
}

const toolStyles: Record<string, React.CSSProperties> = {
  block: { marginBottom: 6, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' },
  header: { width: '100%', background: 'none', border: 'none', borderLeft: '3px solid var(--text-tertiary)', cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7 },
  icon: { fontSize: 12, flexShrink: 0 },
  name: { fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, flexShrink: 0 },
  body: { padding: '0 10px 10px', borderTop: '1px solid var(--border-light)' },
  section: { marginTop: 8 },
  sectionLabel: { fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.1em', fontFamily: "'IBM Plex Mono', monospace", display: 'block', marginBottom: 4 },
  code: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, maxHeight: 180, overflow: 'auto', background: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: 6 },
}

const mdStyles: Record<string, React.CSSProperties> = {
  p: { fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, margin: '2px 0' },
}
