import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Settings, Conversation, Message, AgentEvent, ToolEvent, AppMode } from '@types'
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
import { isElectron, isRealElectron } from '@utils/env'
import { sendChatMessage } from '@utils/chatApi'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

interface Props {
  conversation: Conversation
  settings: Settings
  mode: AppMode
  onUpdate: (updater: (c: Conversation) => Partial<Conversation>) => void
  branchConversations?: Conversation[]
  onCreateBranch?: () => void
  onSelectConversation?: (id: string) => void
}

export default function ChatPage({ conversation, settings, mode, onUpdate, branchConversations, onCreateBranch, onSelectConversation }: Props) {
  const [input, setInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [isSmartMode, setIsSmartMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const historyPanelRef = useRef<HTMLDivElement>(null)

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

  // Code 模式（Electron）才注册 agent 事件监听器
  useEffect(() => {
    if (mode !== 'code' || !isRealElectron()) return

    const cleanup = window.electron.onAgentEvent(handleAgentEvent)
    cleanupRef.current = cleanup
    return () => cleanup()
  }, [handleAgentEvent, mode])

  useEffect(() => {
    if (!showHistory) return
    const handler = (e: MouseEvent) => {
      if (historyPanelRef.current && !historyPanelRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showHistory])

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

    // ─── Chat 模式：直接调 API，浏览器 / Electron 均可 ──────────────────────
    if (mode === 'chat') {
      try {
        const text = await sendChatMessage(
          settings.apiKey,
          settings.model,
          updated.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        )
        onUpdate(conv => {
          const msgs = [...conv.messages]
          msgs.push({ role: 'assistant', content: text, events: [] })
          const firstUser = msgs.find(m => m.role === 'user')
          return { messages: msgs, title: firstUser?.content.slice(0, 30) ?? '对话' }
        })
      } catch (err) {
        const errMsg = (err as Error).message
        onUpdate(conv => ({
          messages: [
            ...conv.messages,
            { role: 'assistant', content: `⚠️ ${errMsg}`, error: true, events: [] },
          ],
        }))
      }
      setIsRunning(false)
      setStatusText('')
      return
    }

    // ─── Code 模式：Electron agent loop（含工具调用） ────────────────────────
    if (!isRealElectron()) {
      // 不应该到这里（TabBar 已禁用 Code 模式），保底提示
      onUpdate(conv => ({
        messages: [
          ...conv.messages,
          { role: 'assistant', content: '⚠️ Code 模式仅在 Electron 桌面版中可用。', error: true, events: [] },
        ],
      }))
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
      {/* 右上角悬浮操作按钮 */}
      <div ref={historyPanelRef} style={floatStyles.container}>
        <button
          style={floatStyles.btn}
          title="创建分支会话"
          onClick={() => onCreateBranch?.()}
        >
          <PlusIcon />
        </button>
        <button
          style={{ ...floatStyles.btn, ...(showHistory ? floatStyles.btnActive : {}) }}
          title="分支历史"
          onClick={() => setShowHistory(p => !p)}
        >
          <HistoryIcon />
        </button>

        {showHistory && (
          <div style={floatStyles.panel}>
            <div style={floatStyles.panelHeader}>分支历史</div>
            <div style={floatStyles.list}>
              {(branchConversations ?? []).map(conv => {
                const isCurrent = conv.id === conversation.id
                return (
                  <button
                    key={conv.id}
                    style={{ ...floatStyles.item, ...(isCurrent ? floatStyles.itemActive : {}) }}
                    onClick={() => { onSelectConversation?.(conv.id); setShowHistory(false) }}
                  >
                    <span style={floatStyles.itemTitle}>{conv.title}</span>
                    <span style={floatStyles.itemMeta}>
                      {isCurrent ? 'Current Chat' : formatRelativeTime(conv.createdAt)}
                    </span>
                  </button>
                )
              })}
              {(!branchConversations || branchConversations.length === 0) && (
                <div style={floatStyles.empty}>暂无历史记录</div>
              )}
            </div>
            <div style={floatStyles.panelDivider} />
            <button
              style={floatStyles.createBtn}
              onClick={() => { onCreateBranch?.(); setShowHistory(false) }}
            >
              <PlusIcon size={12} />
              <span>创建分支会话</span>
            </button>
          </div>
        )}
      </div>

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
          placeholder={mode === 'chat' ? '输入消息...' : '输入任务...'}
          disabled={isRunning}
          renderToolbar={() => (
            <ChatInputToolbar
              leftContent={
                // Code 模式才显示文件附件按钮
                mode === 'code' ? (
                  <IconButton
                    variant="bordered"
                    icon={<AttachIcon />}
                    title="上传文件"
                  />
                ) : null
              }
              rightContent={(
                <>
                  {/* Code 模式才显示工作目录 */}
                  {mode === 'code' && isRealElectron() && (
                    <>
                      <div style={styles.statusItem}>
                        <FolderIcon size={14} />
                        <span style={styles.statusText}>{workspaceName}</span>
                      </div>
                      <div style={styles.divider} />
                    </>
                  )}

                  {/* Chat 模式显示当前模型名 */}
                  {mode === 'chat' && settings.model && (
                    <span style={styles.modelName}>{settings.model}</span>
                  )}

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
function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function HistoryIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 4.5V7L9 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
  page: { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden', position: 'relative' },
  messages: { flex: 1, overflowY: 'auto', padding: '24px 0 8px' },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 40px', color: 'var(--text-tertiary)' },
  statusRowText: { fontSize: 12 },
  inputArea: { padding: '8px 20px 16px' },
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

const floatStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 12,
    right: 16,
    display: 'flex',
    gap: 6,
    zIndex: 10,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid var(--border-medium)',
    background: 'var(--bg-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s ease',
    padding: 0,
  },
  btnActive: {
    background: 'var(--bg-secondary)',
    borderColor: 'var(--border-strong)',
    color: 'var(--text-primary)',
  },
  panel: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 240,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-medium)',
    borderRadius: 10,
    boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '10px 14px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid var(--border-light)',
  },
  list: {
    maxHeight: 240,
    overflowY: 'auto',
  },
  item: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    padding: '9px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.12s',
  },
  itemActive: {
    background: 'var(--bg-secondary)',
  },
  itemTitle: {
    fontSize: 13,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
    fontWeight: 500,
  },
  itemMeta: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  empty: {
    padding: '14px',
    fontSize: 13,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
  },
  panelDivider: {
    height: 1,
    background: 'var(--border-light)',
    margin: '0',
  },
  createBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontFamily: 'inherit',
    transition: 'background 0.12s',
  },
}
