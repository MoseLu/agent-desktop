import React, { useState, useRef, useEffect } from 'react'
import { SlidersIcon } from '@ui/icons'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'

// ─── Types ───────────────────────────────────────────────────────────────────

type View = 'main' | 'subagent' | 'mcp'

interface Agent {
  id: string
  name: string
  enabled: boolean
}

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_AGENTS: Agent[] = [
  { id: 'docx', name: 'docx 文档专家', enabled: true },
  { id: 'ppt', name: 'PPT', enabled: true },
  { id: 'report', name: '报告撰写', enabled: true },
  { id: 'research', name: '深度调研', enabled: true },
  { id: 'pdf-docx', name: 'pdf&docx文档专家', enabled: false },
]

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange() }}
      style={{
        ...toggleStyles.track,
        background: enabled ? 'var(--accent-primary, #1677ff)' : 'var(--border-medium, #444)',
      }}
      aria-checked={enabled}
      role="switch"
    >
      <span
        style={{
          ...toggleStyles.thumb,
          transform: enabled ? 'translateX(14px)' : 'translateX(2px)',
        }}
      />
    </button>
  )
}

const toggleStyles: Record<string, React.CSSProperties> = {
  track: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    width: 32,
    height: 18,
    borderRadius: 9,
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    transition: 'background 0.2s ease',
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s ease',
  },
}

// ─── Main view ────────────────────────────────────────────────────────────────

function MainView({
  browserExpertEnabled,
  onToggleBrowser,
  onGoSubAgent,
  onGoMcp,
  onClose,
}: {
  browserExpertEnabled: boolean
  onToggleBrowser: () => void
  onGoSubAgent: () => void
  onGoMcp: () => void
  onClose: () => void
}) {
  return (
    <>
      {/* 浏览器专家 */}
      <div style={menuStyles.item}>
        <span style={menuStyles.itemLabel}>浏览器专家</span>
        <Toggle enabled={browserExpertEnabled} onChange={onToggleBrowser} />
      </div>

      {/* 子代理 → */}
      <div style={menuStyles.item} onClick={onGoSubAgent}>
        <span style={menuStyles.itemLabel}>子代理</span>
        <RightOutlined style={menuStyles.arrow} />
      </div>

      {/* MCP → */}
      <div style={menuStyles.item} onClick={onGoMcp}>
        <span style={menuStyles.itemLabel}>MCP</span>
        <RightOutlined style={menuStyles.arrow} />
      </div>

      <div style={menuStyles.divider} />

      {/* 项目设置 */}
      <div style={menuStyles.item} onClick={onClose}>
        <span style={menuStyles.itemLabel}>项目设置</span>
      </div>
    </>
  )
}

// ─── Sub-agent view ───────────────────────────────────────────────────────────

function SubAgentView({
  agents,
  onToggle,
  onBack,
}: {
  agents: Agent[]
  onToggle: (id: string) => void
  onBack: () => void
}) {
  return (
    <>
      {/* Header with back button */}
      <div style={menuStyles.subHeader}>
        <button style={menuStyles.backBtn} onClick={onBack}>
          <LeftOutlined style={{ fontSize: 12 }} />
        </button>
        <span style={menuStyles.subHeaderTitle}>子代理</span>
      </div>

      {/* Section: 内置 */}
      <div style={menuStyles.sectionLabel}>内置</div>

      {agents.map(agent => (
        <div key={agent.id} style={menuStyles.item}>
          <span style={menuStyles.itemLabel}>{agent.name}</span>
          <Toggle enabled={agent.enabled} onChange={() => onToggle(agent.id)} />
        </div>
      ))}

      <div style={menuStyles.divider} />

      {/* 管理子代理 */}
      <div style={{ ...menuStyles.item, justifyContent: 'center' }}>
        <span style={menuStyles.manageLink}>管理子代理</span>
      </div>
    </>
  )
}

// ─── MCP view ─────────────────────────────────────────────────────────────────

function McpView({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div style={menuStyles.subHeader}>
        <button style={menuStyles.backBtn} onClick={onBack}>
          <LeftOutlined style={{ fontSize: 12 }} />
        </button>
        <span style={menuStyles.subHeaderTitle}>MCP</span>
      </div>
      <div style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: 13 }}>
        暂无 MCP 配置
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ToolbarDropdownMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<View>('main')
  const [browserExpertEnabled, setBrowserExpertEnabled] = useState(true)
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setView('main')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [isOpen])

  const handleTrigger = () => {
    if (!isOpen) {
      setView('main')
    }
    setIsOpen(p => !p)
  }

  const toggleAgent = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a))
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={handleTrigger}
        style={{
          ...triggerStyles.btn,
          ...(isOpen ? triggerStyles.btnActive : {}),
        }}
        title="工具菜单"
      >
        <SlidersIcon size={15} />
      </button>

      {/* Dropdown panel — opens upward */}
      {isOpen && (
        <div style={menuStyles.panel}>
          {view === 'main' && (
            <MainView
              browserExpertEnabled={browserExpertEnabled}
              onToggleBrowser={() => setBrowserExpertEnabled(p => !p)}
              onGoSubAgent={() => setView('subagent')}
              onGoMcp={() => setView('mcp')}
              onClose={() => { setIsOpen(false); setView('main') }}
            />
          )}
          {view === 'subagent' && (
            <SubAgentView
              agents={agents}
              onToggle={toggleAgent}
              onBack={() => setView('main')}
            />
          )}
          {view === 'mcp' && (
            <McpView onBack={() => setView('main')} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const triggerStyles: Record<string, React.CSSProperties> = {
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    border: '1px solid var(--border-medium)',
    borderRadius: 8,
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--icon-secondary, var(--text-secondary))',
    transition: 'background 0.15s, color 0.15s',
    padding: 0,
  },
  btnActive: {
    background: 'var(--hover-bg, rgba(255,255,255,0.06))',
    color: 'var(--text-primary)',
    borderColor: 'var(--border-medium)',
  },
}

const menuStyles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    left: 0,
    width: 220,
    background: 'var(--input-bg)',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--border-dark)',
    zIndex: 2000,
    overflow: 'hidden',
    animation: 'toolbarDropdownIn 0.18s ease-out',
  },
  subHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid var(--border-light)',
  },
  subHeaderTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: '1px solid var(--border-medium)',
    borderRadius: 6,
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: 0,
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontWeight: 500,
    padding: '8px 16px 4px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'background 0.1s',
    gap: 8,
  },
  itemLabel: {
    fontSize: 13.5,
    color: 'var(--text-primary)',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  arrow: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  divider: {
    height: 1,
    background: 'var(--border-light)',
    margin: '4px 0',
  },
  manageLink: {
    fontSize: 13,
    color: 'var(--accent-primary, #1677ff)',
    fontWeight: 500,
    cursor: 'pointer',
  },
}

// Inject animation keyframes once
if (typeof document !== 'undefined') {
  const id = 'toolbar-dropdown-animation'
  if (!document.getElementById(id)) {
    const el = document.createElement('style')
    el.id = id
    el.textContent = `
      @keyframes toolbarDropdownIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      [data-toolbar-item]:hover {
        background: var(--hover-bg, rgba(255,255,255,0.05));
      }
    `
    document.head.appendChild(el)
  }
}
