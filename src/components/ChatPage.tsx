import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import type { Settings, Conversation, Message, AgentEvent, ToolEvent } from '../types'

// ─── Right-panel types ────────────────────────────────────────────────────────
interface PStep { kind: 'step'; step: number; maxSteps: number; ts: number }
interface PTool { kind: 'tool'; id: string; name: string; input: Record<string, unknown>; done: boolean; result?: unknown; duration?: number; isError?: boolean; ts: number }
type PItem = PStep | PTool

interface ShellItem { id: string; command: string; output?: string; isError?: boolean; duration?: number; ts: number }
interface FileItem { id: string; op: string; path: string; ts: number }

const FILE_OPS: Record<string, string> = {
  read_file: 'read', write_file: 'write', list_files: 'list',
  move_file: 'move', delete_file: 'delete', create_directory: 'mkdir', search_files: 'search',
}
const OP_COLORS: Record<string, string> = {
  read: '#dbeafe', write: '#dcfce7', list: '#f3f4f6',
  move: '#fef9c3', delete: '#fee2e2', mkdir: '#ede9fe', search: '#f0fdf4',
}
const OP_LABELS: Record<string, string> = {
  read: '读取', write: '写入', list: '列目录', move: '移动', delete: '删除', mkdir: '创建', search: '搜索',
}

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
  // Right panel
  const [rightTab, setRightTab] = useState<'process' | 'files' | 'shell'>('process')
  const [procLog, setProcLog] = useState<PItem[]>([])
  const [shellLog, setShellLog] = useState<ShellItem[]>([])
  const [fileLog, setFileLog] = useState<FileItem[]>([])
  // Input options popup
  const [showOpts, setShowOpts] = useState(false)
  const [browserOn, setBrowserOn] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const optsRef = useRef<HTMLDivElement>(null)
  const messages = conversation.messages

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close options popup on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (optsRef.current && !optsRef.current.contains(e.target as Node)) setShowOpts(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const handleAgentEvent = useCallback((ev: AgentEvent) => {
    switch (ev.type) {
      case 'step':
        setProcLog(p => [...p, { kind: 'step', step: ev.step as number, maxSteps: ev.maxSteps as number, ts: Date.now() }])
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

      case 'tool_start': {
        const id = ev.id as string
        const name = ev.name as string
        const inp = ev.input as Record<string, unknown>
        setProcLog(p => [...p, { kind: 'tool', id, name, input: inp, done: false, ts: Date.now() }])
        setStatusText(`执行 ${name}...`)
        if (FILE_OPS[name]) {
          const path = (inp.path ?? inp.source ?? '') as string
          setFileLog(p => [...p, { id, op: FILE_OPS[name], path, ts: Date.now() }])
        }
        if (name === 'execute_shell') {
          setShellLog(p => [...p, { id, command: (inp.command ?? '') as string, ts: Date.now() }])
        }
        onUpdate(conv => {
          const msgs = [...conv.messages]
          const last = msgs[msgs.length - 1]
          const toolEv: ToolEvent = { type: 'tool_start', id, name, input: inp }
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, events: [...(last.events ?? []), toolEv] }
          } else {
            msgs.push({ role: 'assistant', content: '', streaming: true, events: [toolEv] })
          }
          return { messages: msgs }
        })
        break
      }

      case 'tool_result': {
        const id = ev.id as string
        const res = ev.result as Record<string, unknown>
        const dur = ev.duration as number
        const isErr = ev.isError as boolean
        setProcLog(p => p.map(i =>
          i.kind === 'tool' && i.id === id ? { ...i, done: true, result: res, duration: dur, isError: isErr } : i
        ))
        setShellLog(p => p.map(i =>
          i.id === id
            ? { ...i, output: (res?.output ?? res?.stderr ?? JSON.stringify(res, null, 2)) as string, isError: isErr, duration: dur }
            : i
        ))
        onUpdate(conv => {
          const msgs = [...conv.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant') {
            const events = (last.events ?? []).map(e =>
              e.id === id ? { ...e, type: 'tool_result' as const, result: res, duration: dur, isError: isErr } : e
            )
            msgs[msgs.length - 1] = { ...last, events }
          }
          return { messages: msgs }
        })
        break
      }

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
      case 'stopped':
        setIsRunning(false)
        setStatusText('')
        break
    }
  }, [onUpdate])

  useEffect(() => {
    const cleanup = window.electron.onAgentEvent(handleAgentEvent)
    return () => cleanup()
  }, [handleAgentEvent])

  const sendMessage = async (content = input.trim()) => {
    if (!content || isRunning) return
    setInput('')
    setIsRunning(true)
    setStatusText('思考中...')
    // Clear right panel logs for new run
    setProcLog([])
    setShellLog([])
    setFileLog([])

    const userMsg: Message = { role: 'user', content }
    const updated = [...messages, userMsg]
    onUpdate(() => ({ messages: updated }))
    if (messages.length === 0) onUpdate(() => ({ title: content.slice(0, 30) }))

    const result = await window.electron.agentRun({
      messages: updated.map(m => ({ role: m.role, content: m.content })),
      workspace: settings.workspace,
    })
    if (result.error) { setIsRunning(false); setStatusText('') }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const workspaceName = settings.workspace.split(/[/\\]/).filter(Boolean).pop() ?? settings.workspace

  return (
    <div style={styles.page}>
      {/* ── Left: messages + input ── */}
      <div style={styles.main}>
        <div style={styles.messages}>
          {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
          {isRunning && statusText && (
            <div style={styles.statusRow}>
              <ThinkingDots />
              <span style={styles.statusText}>{statusText}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* "View all files" bar */}
        {fileLog.length > 0 && (
          <button style={styles.viewFilesBar} onClick={() => setRightTab('files')}>
            <FolderOpenIcon />
            <span>查看此任务中的所有文件</span>
          </button>
        )}

        {/* Input area */}
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
                {/* Options popup trigger */}
                <div style={{ position: 'relative' }} ref={optsRef}>
                  <button
                    style={{ ...styles.toolBtn, ...(showOpts ? styles.toolBtnActive : {}) }}
                    title="选项"
                    onClick={() => setShowOpts(p => !p)}
                  >
                    <SettingsSliderIcon />
                  </button>
                  {showOpts && (
                    <div style={styles.optsMenu}>
                      <div style={styles.optsRow}>
                        <span style={styles.optsLabel}>浏览器专家</span>
                        <button
                          style={{ ...styles.toggle, ...(browserOn ? styles.toggleOn : {}) }}
                          onClick={() => setBrowserOn(p => !p)}
                        >
                          <div style={{ ...styles.knob, ...(browserOn ? styles.knobOn : {}) }} />
                        </button>
                      </div>
                      <div style={styles.optsDivider} />
                      <div style={styles.optsItem}>
                        <span style={styles.optsLabel}>子代理</span>
                        <ChevronSmIcon />
                      </div>
                      <div style={styles.optsItem}>
                        <span style={styles.optsLabel}>MCP</span>
                        <ChevronSmIcon />
                      </div>
                      <div style={styles.optsDivider} />
                      <div style={styles.optsItem}>
                        <span style={styles.optsLabel}>项目设置</span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={styles.workspacePill}>
                  <FolderIcon />
                  <span style={styles.workspaceText}>{workspaceName}</span>
                </div>
              </div>
              <div style={styles.toolbarRight}>
                <span style={styles.modelName}>
                  {settings.model.includes('sonnet') ? 'Claude Sonnet 4'
                    : settings.model.includes('opus') ? 'Claude Opus 4.5'
                    : 'Claude Haiku 4.5'}
                </span>
                {isRunning ? (
                  <button style={styles.stopBtn} onClick={() => window.electron.agentStop()}>
                    <StopIcon />
                    <span>停止</span>
                  </button>
                ) : (
                  <button
                    style={{ ...styles.sendBtn, ...(input.trim() ? styles.sendBtnActive : {}) }}
                    onClick={() => sendMessage()}
                    disabled={!input.trim()}
                  >
                    <SendIcon active={!!input.trim()} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={styles.rightPanel}>
        <div style={styles.rightTabs}>
          {(['process', 'files', 'shell'] as const).map(t => (
            <button
              key={t}
              style={{ ...styles.rightTab, ...(rightTab === t ? styles.rightTabActive : {}) }}
              onClick={() => setRightTab(t)}
            >
              {t === 'process' ? '当前进程' : t === 'files' ? '文件' : '命令行执行'}
              {t === 'shell' && shellLog.length > 0 && <span style={styles.badge}>{shellLog.length}</span>}
              {t === 'files' && fileLog.length > 0 && <span style={styles.badge}>{fileLog.length}</span>}
            </button>
          ))}
        </div>
        <div style={styles.rightBody}>
          {rightTab === 'process' && <ProcessPanel items={procLog} />}
          {rightTab === 'files' && <FilesPanel items={fileLog} />}
          {rightTab === 'shell' && <ShellPanel items={shellLog} />}
        </div>
      </div>
    </div>
  )
}

// ─── Right panel sub-components ───────────────────────────────────────────────
function ProcessPanel({ items }: { items: PItem[] }) {
  if (items.length === 0) {
    return <div style={rp.empty}>等待任务启动...</div>
  }
  return (
    <div style={rp.list}>
      {items.map((item, i) => (
        <div key={i} style={rp.item}>
          {item.kind === 'step' ? (
            <div style={rp.stepRow}>
              <div style={rp.stepDot} />
              <span style={rp.stepLabel}>步骤 {item.step} / {item.maxSteps}</span>
            </div>
          ) : (
            <div style={rp.toolRow}>
              <div style={{
                ...rp.toolDot,
                background: item.isError ? '#f87171' : item.done ? '#22c55e' : '#f59e0b',
              }} />
              <div style={rp.toolInfo}>
                <span style={rp.toolName}>{item.name}</span>
                {item.duration !== undefined && (
                  <span style={rp.toolDur}>{item.duration}ms</span>
                )}
              </div>
              {!item.done && <MiniSpinner />}
              {item.done && !item.isError && <CheckSm />}
              {item.done && item.isError && <ErrSm />}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function FilesPanel({ items }: { items: FileItem[] }) {
  if (items.length === 0) {
    return <div style={rp.empty}>暂无文件操作</div>
  }
  return (
    <div style={rp.list}>
      {items.map((item, i) => (
        <div key={i} style={rp.fileRow}>
          <span style={{ ...rp.fileOp, background: OP_COLORS[item.op] ?? '#f3f4f6' }}>
            {OP_LABELS[item.op] ?? item.op}
          </span>
          <span style={rp.filePath} title={item.path}>
            {item.path.split(/[/\\]/).pop() || item.path}
          </span>
        </div>
      ))}
    </div>
  )
}

function ShellPanel({ items }: { items: ShellItem[] }) {
  if (items.length === 0) {
    return (
      <div style={{ ...rp.empty, background: '#0d1117', color: '#6e7681', height: '100%' }}>
        暂无命令执行
      </div>
    )
  }
  return (
    <div style={rp.shellList}>
      {items.map((item, i) => (
        <div key={i} style={rp.shellItem}>
          <div style={rp.shellCmd}>
            <span style={rp.shellPrompt}>$</span>
            <span style={rp.shellCmdText} title={item.command}>{item.command}</span>
            {item.duration !== undefined && <span style={rp.shellDur}>{item.duration}ms</span>}
          </div>
          {item.output !== undefined ? (
            <pre style={{ ...rp.shellOutput, color: item.isError ? '#f87171' : '#86efac' }}>
              {String(item.output).slice(0, 3000)}
            </pre>
          ) : (
            <div style={rp.shellRunning}>
              <MiniSpinner light />
              <span>运行中...</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Message bubble ────────────────────────────────────────────────────────────
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
  return (
    <div style={toolStyles.block}>
      <button style={toolStyles.header} onClick={() => setOpen(p => !p)}>
        <span style={toolStyles.icon}>🔧</span>
        <span style={toolStyles.name}>{event.name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {isDone && !event.isError && <CheckMark />}
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
  return (
    <div>
      {text.split('\n').map((line, i) =>
        line.trim() === ''
          ? <div key={i} style={{ height: 6 }} />
          : <p key={i} style={mdStyles.p}>{line}</p>
      )}
    </div>
  )
}

function ThinkingDots() {
  return (
    <span style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: '#999',
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          display: 'inline-block',
        }} />
      ))}
    </span>
  )
}

// ─── Small utility components ──────────────────────────────────────────────────
function MiniSpinner({ light }: { light?: boolean }) {
  return (
    <div style={{
      width: 12, height: 12, borderRadius: '50%',
      border: `2px solid ${light ? '#30363d' : '#e5e7eb'}`,
      borderTopColor: light ? '#58a6ff' : '#6b7280',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}
function CheckSm() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function ErrSm() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="3" y1="3" x2="9" y2="9" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" /><line x1="9" y1="3" x2="3" y2="9" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function ChevronSmIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3 L9 7 L5 11" stroke="#aaa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
}
function SettingsSliderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" />
      <circle cx="8" cy="6" r="2.5" fill="currentColor" stroke="none" />
      <line x1="4" y1="18" x2="20" y2="18" strokeLinecap="round" />
      <circle cx="16" cy="18" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
function FolderIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
}
function FolderOpenIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1" /><polyline points="1 11 1 19 23 19 23 7 12 7" /></svg>
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
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="#666"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
}
function MiniChevron({ open }: { open: boolean }) {
  return <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}><path d="M2 4 L6 8 L10 4" stroke="#aaa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function CheckMark() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: { flex: 1, display: 'flex', overflow: 'hidden', background: '#fff' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  messages: { flex: 1, overflowY: 'auto', padding: '24px 0' },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 40px', color: '#999' },
  statusText: { fontSize: 12 },
  viewFilesBar: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '9px 32px', background: 'none', border: 'none',
    borderTop: '1px solid #f5f5f5', cursor: 'pointer',
    fontSize: 12.5, color: '#2196f3', fontFamily: 'inherit',
    textAlign: 'left',
  },
  inputArea: { padding: '12px 24px 20px' },
  inputBox: {
    border: '1.5px solid #e8e8e8', borderRadius: 14,
    background: '#fff', transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  inputBoxFocused: { border: '1.5px solid #b0b0b0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  textarea: {
    width: '100%', border: 'none', background: 'transparent',
    padding: '12px 14px 0', fontSize: 14, color: '#333',
    resize: 'none', outline: 'none', lineHeight: 1.6,
    fontFamily: "'Noto Sans SC', sans-serif", minHeight: 56,
    boxSizing: 'border-box',
  },
  inputToolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 10px 8px', borderTop: '1px solid #f5f5f5',
  },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: 4 },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 8 },
  toolBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 5, borderRadius: 6, display: 'flex', alignItems: 'center',
    transition: 'background 0.1s', color: '#888',
  },
  toolBtnActive: { background: '#f0f0f0', color: '#333' },
  workspacePill: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 20,
    border: '1px solid #eee', background: '#fafafa',
    cursor: 'pointer', marginLeft: 4,
  },
  workspaceText: { fontSize: 12, color: '#666', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  modelName: { fontSize: 12.5, color: '#666', fontWeight: 500, paddingRight: 4 },
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
  // Options popup
  optsMenu: {
    position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
    width: 210, background: '#fff', borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.05)',
    zIndex: 100, overflow: 'hidden',
  },
  optsRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '11px 14px',
  },
  optsItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '11px 14px', cursor: 'pointer',
  },
  optsLabel: { fontSize: 13.5, color: '#1a1a1a' },
  optsDivider: { height: 1, background: '#f0f0f0', margin: '2px 0' },
  // Toggle switch
  toggle: {
    width: 38, height: 22, borderRadius: 11, background: '#e5e7eb',
    border: 'none', cursor: 'pointer', position: 'relative', padding: 0,
    transition: 'background 0.2s', flexShrink: 0,
  },
  toggleOn: { background: '#3b82f6' },
  knob: {
    position: 'absolute', width: 16, height: 16, borderRadius: '50%',
    background: '#fff', top: 3, left: 3,
    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  knobOn: { left: 19 },
  // Right panel
  rightPanel: {
    width: 300, borderLeft: '1px solid #efefef',
    display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0,
  },
  rightTabs: {
    display: 'flex', borderBottom: '1px solid #f0f0f0',
    background: '#fafafa', flexShrink: 0,
  },
  rightTab: {
    flex: 1, background: 'none', border: 'none', borderBottom: '2px solid transparent',
    padding: '10px 4px', fontSize: 11.5, color: '#888',
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    transition: 'color 0.15s',
  },
  rightTabActive: { color: '#1a1a1a', borderBottomColor: '#1a1a1a', fontWeight: 500 },
  rightBody: { flex: 1, overflowY: 'auto' },
  badge: {
    fontSize: 9, fontWeight: 600, background: '#e5e7eb',
    color: '#374151', borderRadius: 8, padding: '1px 5px',
  },
}

const msgStyles: Record<string, React.CSSProperties> = {
  userRow: { display: 'flex', justifyContent: 'flex-end', padding: '6px 32px' },
  userBubble: { maxWidth: '70%', background: '#f5f5f5', borderRadius: '14px 14px 4px 14px', padding: '11px 15px' },
  userText: { fontSize: 14, color: '#333', lineHeight: 1.65, margin: 0 },
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
  name: { fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, flexShrink: 0, color: '#888' },
  body: { padding: '0 10px 10px', borderTop: '1px solid #f0f0f0' },
  section: { marginTop: 8 },
  sectionLabel: { fontSize: 10, color: '#bbb', letterSpacing: '0.1em', fontFamily: "'IBM Plex Mono', monospace", display: 'block', marginBottom: 4 },
  code: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#666', lineHeight: 1.5, maxHeight: 180, overflow: 'auto', background: '#f5f5f5', padding: '8px 10px', borderRadius: 6, margin: 0 },
}

const mdStyles: Record<string, React.CSSProperties> = {
  p: { fontSize: 14, color: '#333', lineHeight: 1.7, margin: '2px 0' },
}

// Right panel styles
const rp: Record<string, React.CSSProperties> = {
  list: { padding: '8px 6px' },
  item: { marginBottom: 3 },
  stepRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px' },
  stepDot: { width: 6, height: 6, borderRadius: '50%', background: '#d1d5db', flexShrink: 0 },
  stepLabel: { fontSize: 11.5, color: '#9ca3af' },
  toolRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 8px', background: '#fff', borderRadius: 6,
    border: '1px solid #f0f0f0',
  },
  toolDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  toolInfo: { flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 },
  toolName: {
    fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace",
    color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  toolDur: { fontSize: 10, color: '#9ca3af', flexShrink: 0 },
  // Files panel
  fileRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px', borderBottom: '1px solid #f9fafb',
  },
  fileOp: {
    fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 3,
    fontFamily: "'IBM Plex Mono', monospace", color: '#374151', flexShrink: 0,
  },
  filePath: {
    fontSize: 12, color: '#4b5563',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  // Shell panel
  shellList: { background: '#0d1117', minHeight: '100%' },
  shellItem: { borderBottom: '1px solid #21262d', padding: '12px' },
  shellCmd: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  shellPrompt: { color: '#58a6ff', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, flexShrink: 0 },
  shellCmdText: {
    color: '#f0f6fc', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5,
    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  shellDur: { fontSize: 10, color: '#6e7681', flexShrink: 0 },
  shellOutput: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, lineHeight: 1.5,
    margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    maxHeight: 220, overflow: 'auto',
  },
  shellRunning: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6e7681' },
  empty: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 120, fontSize: 13, color: '#9ca3af',
    padding: '40px 16px', textAlign: 'center',
  },
}

// Inject keyframe animations once
if (typeof document !== 'undefined') {
  const id = 'chat-keyframes'
  if (!document.getElementById(id)) {
    const el = document.createElement('style')
    el.id = id
    el.textContent = `
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100% { opacity:0.3; transform:scale(0.8); } 50% { opacity:1; transform:scale(1); } }
      @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
      @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    `
    document.head.appendChild(el)
  }
}
