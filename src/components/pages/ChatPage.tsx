import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Settings, Conversation, Message, AgentEvent, ToolEvent } from '@types'
import IconButton from '@ui/IconButton'
import Tooltip from '@ui/Tooltip'
import ChatInput from '@ui/ChatInput'
import ChatInputToolbar from '@ui/ChatInputToolbar'
import ToolbarDropdownMenu from '@ui/ToolbarDropdownMenu'
import SplitPane from '@ui/SplitPane'
import PreviewPanel from '@ui/PreviewPanel'
import {
  AttachIcon,
  FolderIcon,
  LightningIcon,
  GearIcon,
  OmnipotentModeIcon as OmnipotentIcon,
} from '@ui/icons'
import { ArrowUpOutlined, SplitCellsOutlined } from '@ant-design/icons'
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
  const [showPreview, setShowPreview] = useState(false)
  const [rightPanel, setRightPanel] = useState<
    | null
    | { mode: 'tool'; event: ToolEvent }
    | { mode: 'files'; events: ToolEvent[] }
  >(null)
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

  const chatColumn = (
    <div style={styles.chatColumn}>
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            selectedToolId={rightPanel?.mode === 'tool' ? rightPanel.event.id : null}
            onSelectTool={event => { setRightPanel({ mode: 'tool', event }); setShowPreview(false) }}
            onShowFiles={events => { setRightPanel({ mode: 'files', events }); setShowPreview(false) }}
          />
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
                <>
                  <IconButton
                    variant="bordered"
                    icon={<AttachIcon />}
                    title="上传文件"
                  />
                  <ToolbarDropdownMenu />
                </>
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
                  {/* Preview panel toggle */}
                  <Tooltip title={showPreview ? '隐藏预览' : '显示预览'} position="top">
                    <button
                      onClick={() => setShowPreview(p => !p)}
                      style={{
                        ...styles.previewToggleBtn,
                        ...(showPreview ? styles.previewToggleBtnActive : {}),
                      }}
                    >
                      <SplitCellsOutlined style={{ fontSize: 15 }} />
                    </button>
                  </Tooltip>
                  <div style={styles.divider} />
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

  return (
    <div style={styles.page}>
      {(rightPanel !== null || showPreview) ? (
        <SplitPane
          left={chatColumn}
          right={
            rightPanel !== null ? (
              <ToolDetailPanel
                panel={rightPanel}
                onClose={() => setRightPanel(null)}
                onSelectTool={event => setRightPanel({ mode: 'tool', event })}
              />
            ) : (
              <PreviewPanel
                messages={messages}
                workspace={settings.workspace || ''}
                onClose={() => setShowPreview(false)}
              />
            )
          }
          defaultLeftPercent={62}
          minLeft={320}
          minRight={280}
        />
      ) : (
        chatColumn
      )}
    </div>
  )
}
// ─── Tool helpers ─────────────────────────────────────────────────────────────
const TOOL_NAMES: Record<string, string> = {
  execute_shell: '命令行执行',
  read_file: '读取文件',
  write_file: '写入文件',
  list_files: '列出文件',
  search_files: '搜索文件',
  create_directory: '创建目录',
  move_file: '移动文件',
  delete_file: '删除文件',
}

const FILE_TOOLS = new Set(['read_file', 'write_file', 'list_files', 'search_files', 'create_directory', 'move_file', 'delete_file'])

function getToolSummary(event: ToolEvent): string {
  const { name, input } = event
  switch (name) {
    case 'execute_shell': return (input.command as string) || ''
    case 'read_file':
    case 'write_file':
    case 'list_files':
    case 'create_directory':
    case 'delete_file': return (input.path as string) || ''
    case 'search_files': return (input.directory as string) || (input.path as string) || ''
    case 'move_file': return `${input.source} → ${input.destination}`
    default: return ''
  }
}

function getResultText(result?: Record<string, unknown>): string {
  if (!result) return ''
  if (typeof result.output === 'string') return result.output
  if (typeof result.stdout === 'string') return result.stdout
  if (typeof result.content === 'string') return result.content
  if (typeof result.result === 'string') return result.result
  if (typeof result.error === 'string') return result.error
  return JSON.stringify(result, null, 2)
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ message, selectedToolId, onSelectTool, onShowFiles }: {
  message: Message
  selectedToolId: string | null
  onSelectTool: (event: ToolEvent) => void
  onShowFiles: (events: ToolEvent[]) => void
}) {
  if (message.role === 'user') {
    return (
      <div style={msgStyles.userRow}>
        <div style={msgStyles.userBubble}>
          <p style={msgStyles.userText}>{message.content}</p>
        </div>
      </div>
    )
  }

  const fileEvents = (message.events ?? []).filter(
    e => e.type === 'tool_result' && FILE_TOOLS.has(e.name)
  )
  const showFilesBtn = fileEvents.length > 0 && !message.streaming

  return (
    <div style={msgStyles.assistantRow}>
      <div style={msgStyles.avatar}><AvatarIcon /></div>
      <div style={msgStyles.assistantContent}>
        {message.events?.map((ev, i) => (
          <ToolBlock
            key={i}
            event={ev}
            isSelected={selectedToolId === ev.id}
            onSelect={onSelectTool}
          />
        ))}
        {showFilesBtn && (
          <button
            style={toolStyles.filesBtn}
            onClick={() => onShowFiles(fileEvents)}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M2 4a1 1 0 011-1h3.5l1.5 2H13a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            <span>查看此任务中的所有文件 ({fileEvents.length})</span>
          </button>
        )}
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

function ToolBlock({ event, isSelected, onSelect }: {
  event: ToolEvent
  isSelected: boolean
  onSelect: (event: ToolEvent) => void
}) {
  const isDone = event.type === 'tool_result'
  const isError = !!event.isError
  const toolName = TOOL_NAMES[event.name] || event.name
  const summary = getToolSummary(event)

  const accentColor = isSelected
    ? '#0094fc'
    : isDone
      ? isError ? '#f5222d' : '#52c41a'
      : '#999'

  return (
    <button
      style={{
        ...toolStyles.block,
        borderLeftColor: accentColor,
        background: isSelected ? 'rgba(0,148,252,0.06)' : 'var(--bg-secondary)',
      }}
      onClick={() => onSelect(event)}
    >
      <span style={toolStyles.statusIcon}>
        {isDone
          ? isError ? <ErrorDot /> : <SuccessDot />
          : <RunningDot />
        }
      </span>
      <span style={{ ...toolStyles.statusLabel, color: isDone ? (isError ? '#f5222d' : '#52c41a') : '#999' }}>
        {isDone ? (isError ? '失败' : '已完成') : '执行中'}
      </span>
      <span style={toolStyles.toolName}>{toolName}</span>
      {summary && (
        <span style={toolStyles.summary}>{summary}</span>
      )}
      <span style={{ flex: 1 }} />
      {isDone && event.duration !== undefined && (
        <span style={toolStyles.duration}>
          {event.duration < 1000 ? `${event.duration}ms` : `${(event.duration / 1000).toFixed(1)}s`}
        </span>
      )}
      <span style={toolStyles.arrow}>›</span>
    </button>
  )
}

// ─── Tool detail panel ────────────────────────────────────────────────────────
function ToolDetailPanel({ panel, onClose, onSelectTool }: {
  panel: { mode: 'tool'; event: ToolEvent } | { mode: 'files'; events: ToolEvent[] }
  onClose: () => void
  onSelectTool: (event: ToolEvent) => void
}) {
  if (panel.mode === 'files') {
    return (
      <div style={detailStyles.panel}>
        <div style={detailStyles.header}>
          <span style={detailStyles.headerTitle}>任务文件</span>
          <button style={detailStyles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={detailStyles.body}>
          {panel.events.map((ev, i) => {
            const path = getToolSummary(ev)
            const tag = TOOL_NAMES[ev.name] || ev.name
            return (
              <button key={i} style={detailStyles.fileItem} onClick={() => onSelectTool(ev)}>
                <span style={detailStyles.fileIcon}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M4 2h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M10 2v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span style={detailStyles.filePath}>{path || ev.name}</span>
                <span style={detailStyles.fileTag}>{tag}</span>
                <span style={detailStyles.fileArrow}>›</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const { event } = panel
  const isDone = event.type === 'tool_result'
  const isShell = event.name === 'execute_shell'
  const toolName = TOOL_NAMES[event.name] || event.name
  const summary = getToolSummary(event)
  const resultText = getResultText(event.result)

  return (
    <div style={detailStyles.panel}>
      <div style={detailStyles.header}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={detailStyles.headerTitle}>{toolName}</span>
          {isDone && event.duration !== undefined && (
            <span style={detailStyles.headerDuration}>
              {event.duration < 1000 ? `${event.duration}ms` : `${(event.duration / 1000).toFixed(1)}s`}
            </span>
          )}
          {isDone && (
            <span style={{ ...detailStyles.headerBadge, background: event.isError ? '#fff1f0' : '#f6ffed', color: event.isError ? '#f5222d' : '#52c41a', border: `1px solid ${event.isError ? '#ffa39e' : '#b7eb8f'}` }}>
              {event.isError ? '失败' : '已完成'}
            </span>
          )}
        </div>
        <button style={detailStyles.closeBtn} onClick={onClose}>×</button>
      </div>
      <div style={detailStyles.body}>
        <div style={detailStyles.section}>
          <div style={detailStyles.sectionLabel}>{isShell ? '命令' : '路径'}</div>
          <pre style={{ ...detailStyles.code, ...(isShell ? detailStyles.terminal : {}) }}>
            {isShell ? `$ ${summary}` : summary}
          </pre>
        </div>
        {!isShell && event.input.content != null && (
          <div style={detailStyles.section}>
            <div style={detailStyles.sectionLabel}>写入内容</div>
            <pre style={detailStyles.code}>{String(event.input.content)}</pre>
          </div>
        )}
        {isDone && (
          <div style={detailStyles.section}>
            <div style={detailStyles.sectionLabel}>
              {isShell ? '输出' : event.isError ? '错误信息' : '结果'}
            </div>
            <pre style={{
              ...detailStyles.code,
              ...(isShell ? detailStyles.terminal : {}),
              ...(event.isError ? { color: '#f5222d' } : {}),
            }}>
              {resultText || '(无输出)'}
            </pre>
          </div>
        )}
      </div>
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

function SuccessDot() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="5" fill="#52c41a" />
      <path d="M2.5 5L4 6.5L7.5 3.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ErrorDot() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="5" fill="#f5222d" />
      <path d="M3.5 3.5L6.5 6.5M6.5 3.5L3.5 6.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function RunningDot() {
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: '#999',
      animation: 'pulse 1.2s ease-in-out infinite',
    }} />
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' },
  chatColumn: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' },
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
  previewToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid var(--border-medium)',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    transition: 'all 0.15s',
    padding: 0,
    flexShrink: 0,
  },
  previewToggleBtnActive: {
    background: 'var(--active-bg)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border-dark)',
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
  block: {
    width: '100%', marginBottom: 4,
    borderRadius: 7, border: '1px solid var(--border-light)', borderLeft: '3px solid #999',
    background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
  statusIcon: { flexShrink: 0, display: 'flex', alignItems: 'center' },
  statusLabel: { fontSize: 11, fontWeight: 500, flexShrink: 0 },
  toolName: { fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 },
  summary: { fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280, minWidth: 0 },
  duration: { fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace" },
  arrow: { fontSize: 16, color: 'var(--text-tertiary)', flexShrink: 0, lineHeight: 1 },
  filesBtn: {
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 6,
    padding: '5px 10px', background: 'transparent', border: '1px solid var(--border-light)',
    borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)',
    fontFamily: 'inherit', transition: 'color 0.15s, border-color 0.15s',
  },
}

const detailStyles: Record<string, React.CSSProperties> = {
  panel: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-light)', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border-light)', gap: 8, flexShrink: 0 },
  headerTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  headerDuration: { fontSize: 12, color: 'var(--text-tertiary)', fontFamily: "'IBM Plex Mono', monospace" },
  headerBadge: { fontSize: 11, fontWeight: 500, padding: '1px 7px', borderRadius: 10 },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginLeft: 'auto' },
  body: { flex: 1, overflowY: 'auto', padding: '16px' },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace", display: 'block' },
  code: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 6, overflowX: 'auto' as const, overflowY: 'auto' as const, maxHeight: 380, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const, margin: 0 },
  terminal: { background: '#1a1a1a', color: '#e8e8e8' },
  fileItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', marginBottom: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 8, cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit', transition: 'background 0.15s' },
  fileIcon: { fontSize: 14, flexShrink: 0, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' },
  filePath: { flex: 1, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0 },
  fileTag: { fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace" },
  fileArrow: { fontSize: 16, color: 'var(--text-tertiary)', flexShrink: 0, lineHeight: 1 },
}

const mdStyles: Record<string, React.CSSProperties> = {
  p: { fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, margin: '2px 0' },
}
