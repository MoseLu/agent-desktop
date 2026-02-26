import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import type { Settings, Conversation, Message, AgentEvent, ToolEvent } from '../types'

interface Props {
  conversation: Conversation
  settings: Settings
  onUpdate: (updater: (c: Conversation) => Partial<Conversation>) => void
}

export default function ChatPage({ conversation, settings, onUpdate }: Props) {
  const [input, setInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [focused, setFocused] = useState(false)
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

    const result = await window.electron.agentRun({
      messages: updated.map(m => ({ role: m.role, content: m.content })),
      workspace: settings.workspace,
    })

    if (result.error) {
      setIsRunning(false)
      setStatusText('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const workspaceName = settings.workspace.split(/[/\\]/).filter(Boolean).pop() ?? settings.workspace

  return (
    <div style={styles.page}>
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isRunning && statusText && (
          <div style={styles.statusRow}>
            <ThinkingDots />
            <span style={styles.statusText}>{statusText}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <div style={{ ...styles.inputBox, ...(focused ? styles.inputBoxFocused : {}) }}>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="继续输入任务..."
            disabled={isRunning}
          />
          <div style={styles.inputToolbar}>
            <div style={styles.toolbarLeft}>
              <button style={styles.toolBtn} title="上传文件">
                <AttachIcon />
              </button>
              <button style={styles.toolBtn} title="模式设置">
                <SettingsSliderIcon />
              </button>
              <div style={styles.workspacePill}>
                <FolderIcon />
                <span style={styles.workspaceText}>{workspaceName}</span>
              </div>
            </div>
            <div style={styles.toolbarRight}>
              <span style={styles.modelName}>
                {settings.model.includes('sonnet') ? 'Claude Sonnet 4' : settings.model.includes('opus') ? 'Claude Opus 4.5' : 'Claude Haiku 4.5'}
              </span>
              <button
                style={{ ...styles.toolBtn, ...(isSmartMode ? styles.toolBtnActive : {}) }}
                onClick={() => setIsSmartMode(p => !p)}
                title={isSmartMode ? '智能模式' : '高效模式'}
              >
                <LightningIcon />
              </button>
              <button style={styles.toolBtn} title="设置">
                <GearIcon />
              </button>
              <button
                style={{ ...styles.sendBtn, ...(input.trim() ? styles.sendBtnActive : {}) }}
                onClick={() => sendMessage()}
                disabled={!input.trim()}
              >
                <SendIcon active={!!input.trim()} />
              </button>
            </div>
          </div>
        </div>
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
    <div style={{ width: 26, height: 26, borderRadius: 6, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7 L5 4 L8 7 L5 10Z" fill="white" opacity="0.9" />
        <path d="M6 7 L9 4 L12 7 L9 10Z" fill="white" opacity="0.5" />
      </svg>
    </div>
  )
}

function AttachIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function SettingsSliderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="6" r="3" fill="currentColor" />
      <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="18" r="3" fill="currentColor" />
    </svg>
  )
}

function FolderIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
}

function LightningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function SendIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill={active ? '#1a1a1a' : '#e0e0e0'} />
      <path d="M8 12 L16 12 M12 8 L16 12 L12 16" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StopIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="#666"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
}

function MiniChevron({ open }: { open: boolean }) {
  return <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}><path d="M2 4 L6 8 L10 4" stroke="#aaa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function CheckMark({ color }: { color: string }) {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
}

const styles: Record<string, React.CSSProperties> = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' },
  messages: { flex: 1, overflowY: 'auto', padding: '24px 0' },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 40px', color: '#999' },
  statusText: { fontSize: 12 },
  inputArea: { padding: '12px 24px 20px', borderTop: '1px solid #f0f0f0' },
  inputBox: { border: '1.5px solid #e8e8e8', borderRadius: 14, background: '#fff', transition: 'border-color 0.15s, box-shadow 0.15s' },
  inputBoxFocused: { border: '1.5px solid #b0b0b0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  textarea: { width: '100%', border: 'none', background: 'transparent', padding: '12px 14px 0', fontSize: 14, color: '#333', resize: 'none', outline: 'none', lineHeight: 1.6, fontFamily: "'Noto Sans SC', sans-serif", minHeight: 56 },
  inputToolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 8px', borderTop: '1px solid #f5f5f5' },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: 4 },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 8 },
  toolBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 5, borderRadius: 6, display: 'flex', alignItems: 'center',
    transition: 'background 0.1s', color: '#888',
  },
  toolBtnActive: {
    background: '#f5f5f5', color: '#1a1a1a',
  },
  workspacePill: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 20,
    border: '1px solid #eee', background: '#fafafa',
    cursor: 'pointer', marginLeft: 4,
  },
  workspaceText: { fontSize: 12, color: '#666', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  modelName: {
    fontSize: 12.5, color: '#666', fontWeight: 500,
    paddingRight: 8, paddingLeft: 8,
  },
  sendBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 2, borderRadius: '50%', display: 'flex', alignItems: 'center',
    transition: 'transform 0.1s',
  },
  sendBtnActive: { transform: 'scale(1.05)' },
  stopBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', background: '#f5f5f5',
    border: '1px solid #e0e0e0', borderRadius: 8,
    cursor: 'pointer', fontSize: 12, color: '#666', fontFamily: 'inherit',
  },
}

const msgStyles: Record<string, React.CSSProperties> = {
  userRow: { display: 'flex', justifyContent: 'flex-end', padding: '6px 32px' },
  userBubble: { maxWidth: '70%', background: '#f5f5f5', borderRadius: '14px 14px 4px 14px', padding: '11px 15px' },
  userText: { fontSize: 14, color: '#333', lineHeight: 1.65 },
  assistantRow: { display: 'flex', gap: 11, padding: '6px 32px', alignItems: 'flex-start' },
  avatar: { marginTop: 1, flexShrink: 0 },
  assistantContent: { flex: 1, minWidth: 0 },
  text: { fontSize: 14, color: '#333', lineHeight: 1.7 },
  cursor: { color: '#999', animation: 'blink 1s step-end infinite' },
}

const toolStyles: Record<string, React.CSSProperties> = {
  block: { marginBottom: 6, borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', background: '#fafafa' },
  header: { width: '100%', background: 'none', border: 'none', borderLeft: '3px solid #ccc', cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7 },
  icon: { fontSize: 12, flexShrink: 0 },
  name: { fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, flexShrink: 0 },
  body: { padding: '0 10px 10px', borderTop: '1px solid #f0f0f0' },
  section: { marginTop: 8 },
  sectionLabel: { fontSize: 10, color: '#bbb', letterSpacing: '0.1em', fontFamily: "'IBM Plex Mono', monospace", display: 'block', marginBottom: 4 },
  code: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#666', lineHeight: 1.5, maxHeight: 180, overflow: 'auto', background: '#f5f5f5', padding: '8px 10px', borderRadius: 6 },
}

const mdStyles: Record<string, React.CSSProperties> = {
  p: { fontSize: 14, color: '#333', lineHeight: 1.7, margin: '2px 0' },
}

