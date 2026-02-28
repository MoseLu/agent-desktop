import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Settings, Conversation, Message, AgentEvent, ToolEvent, AppMode } from '@types'
import IconButton from '@ui/IconButton'
import Tooltip from '@ui/Tooltip'
import ChatInput from '@ui/ChatInput'
import ChatInputToolbar from '@ui/ChatInputToolbar'
import ModelSelector from '@ui/ModelSelector'
import { message } from '@ui/Message'
import {
  AttachIcon,
  FolderIcon,
  SlidersIcon,
  LightningIcon,
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
  onSwitchBranch?: (id: string) => void
}

export default function ChatPage({ conversation, settings, mode, onUpdate, branchConversations, onCreateBranch, onSwitchBranch }: Props) {
  const [input, setInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [workspace, setWorkspace] = useState(settings.workspace || '未设置工作目录')
  const [workspaceName, setWorkspaceName] = useState('未设置工作目录')
  const bottomRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // 更新工作目录显示
  useEffect(() => {
    if (settings.workspace) {
      setWorkspace(settings.workspace)
      const parts = settings.workspace.split(/[\\/]/)
      setWorkspaceName(parts[parts.length - 1] || settings.workspace)
    }
  }, [settings.workspace])

  // 选择工作目录（仅首页，会话页不可修改）
  const handleSelectWorkspace = async () => {
    if (!isElectron()) return
    const newWorkspace = await window.electron.pickFolder()
    if (newWorkspace) {
      await window.electron.saveSettings({ workspace: newWorkspace })
      window.dispatchEvent(new CustomEvent('workspace-changed', { detail: newWorkspace }))
    }
  }

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

    // ─── Chat 模式：通过主进程 IPC 调用 API（API Key 来自环境变量）────────────
    if (mode === 'chat') {
      try {
        const text = await sendChatMessage(
          '', // Electron 环境下无需 API Key，由代理服务器统一管理
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

  // 分支列表（包含当前会话本身）
  const branches = branchConversations ?? []
  const hasBranches = branches.length > 1

  // 当前会话的 smartMode（从会话创建时的选择读取）
  const isSmartMode = conversation.smartMode ?? false

  return (
    <div style={styles.page}>
      {/* ── 子会话 Tab 栏（有分支时展示） ── */}
      {hasBranches && (
        <div style={branchTabStyles.bar}>
          {branches.map(conv => {
            const isCurrent = conv.id === conversation.id
            return (
              <button
                key={conv.id}
                style={{
                  ...branchTabStyles.tab,
                  ...(isCurrent ? branchTabStyles.tabActive : {}),
                }}
                onClick={() => {
                  if (!isCurrent) onSwitchBranch?.(conv.id)
                }}
                title={conv.title}
              >
                <span style={branchTabStyles.tabTitle}>{conv.title}</span>
                {!isCurrent && (
                  <span style={branchTabStyles.tabMeta}>{formatRelativeTime(conv.createdAt)}</span>
                )}
              </button>
            )
          })}
          {/* 新建分支按钮 */}
          <button
            style={branchTabStyles.newBtn}
            onClick={() => onCreateBranch?.()}
            title="创建子会话"
          >
            <PlusIcon size={12} />
          </button>
        </div>
      )}

      {/* ── 消息流 ── */}
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

      {/* ── 输入区域 ── */}
      <div style={styles.inputArea}>
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={sendMessage}
          placeholder={mode === 'chat' ? '输入消息...' : '输入任务...'}
          disabled={isRunning}
          renderToolbar={() => (
            <ChatInputToolbar
              leftContent={(
                <>
                  <IconButton
                    variant="bordered"
                    icon={<AttachIcon />}
                    title="上传文件"
                  />
                  <IconButton
                    variant="bordered"
                    icon={<SlidersIcon />}
                    title="更多选项"
                  />
                  {/* 工作目录：Electron 显示，会话中只读 */}
                  {isElectron() && (
                    <Tooltip
                      title={settings.workspace ? `工作目录：${settings.workspace}` : '未设置工作目录'}
                      position="bottom"
                    >
                      <div style={styles.workspacePill}>
                        <FolderIcon size={13} />
                        <span style={styles.workspaceText}>{workspaceName}</span>
                      </div>
                    </Tooltip>
                  )}
                </>
              )}
              rightContent={(
                <>
                  {/* 新建子会话按钮（无分支时也显示） */}
                  {!hasBranches && (
                    <Tooltip title="创建子会话" position="top">
                      <button
                        style={styles.branchBtn}
                        onClick={() => onCreateBranch?.()}
                      >
                        <PlusIcon size={13} />
                      </button>
                    </Tooltip>
                  )}

                  {/* 会话模式只读指示器（全能 / 高效） */}
                  <div style={styles.modeReadOnly}>
                    <Tooltip title={isSmartMode ? '全能模式（创建时选择，不可修改）' : '高效模式（创建时选择，不可修改）'} position="top">
                      <div style={styles.modeIndicator}>
                        {isSmartMode
                          ? <OmnipotentIcon size={14} />
                          : <LightningIcon size={14} />
                        }
                        <span style={styles.modeLabel}>{isSmartMode ? '全能' : '高效'}</span>
                      </div>
                    </Tooltip>
                  </div>

                  {/* 模型切换器 */}
                  <ModelSelector
                    value={settings.model || 'qwen3.5-plus'}
                    onChange={(newModel) => {
                      window.electron.saveSettings({ model: newModel })
                      message.success(`已切换到 ${newModel}`, 1500)
                    }}
                  />

                  <Tooltip title={input.trim() ? '发送（Enter）' : '请输入内容'} position="top">

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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' },
  messages: { flex: 1, overflowY: 'auto', padding: '8px 0 8px' },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 40px', color: 'var(--text-tertiary)' },
  statusRowText: { fontSize: 12 },
  inputArea: { padding: '8px 20px 16px' },

  // 工作目录只读 pill
  workspacePill: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid var(--border-medium)',
    background: 'transparent',
    cursor: 'default',
    marginLeft: 4,
    height: 36,
    minWidth: 100,
    maxWidth: 200,
  },
  workspaceText: {
    fontSize: 12, color: 'var(--text-secondary)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },

  // 模式只读指示器
  modeReadOnly: {
    display: 'flex',
    alignItems: 'center',
    marginRight: 2,
  },
  modeIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '0 8px',
    height: 30,
    borderRadius: 8,
    border: '1px solid var(--border-light)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'default',
  },
  modeLabel: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },

  // 新建子会话按钮（无分支时在 toolbar 右侧显示）
  branchBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 8,
    border: '1px solid var(--border-medium)',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: 0,
  },

  modelName: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    fontWeight: 500,
    paddingRight: 2,
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
}

// ─── 子会话 Tab 栏样式 ─────────────────────────────────────────────────────────
const branchTabStyles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: '0 16px',
    height: 40,
    flexShrink: 0,
    borderBottom: '1px solid var(--border-light)',
    overflowX: 'auto',
    background: 'var(--bg-primary)',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 12px',
    height: 28,
    borderRadius: 6,
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontSize: 12,
    whiteSpace: 'nowrap',
    maxWidth: 160,
    transition: 'all 0.15s',
    flexShrink: 0,
  },
  tabActive: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-medium)',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  tabTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 100,
  },
  tabMeta: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  newBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 6,
    border: '1px solid var(--border-medium)',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    padding: 0,
    flexShrink: 0,
    marginLeft: 2,
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
