import React, { useState, useRef, KeyboardEvent } from 'react'
import type { Settings } from '../types'

interface Props {
  settings: Settings
  onStartTask: (prompt?: string) => void
}

const QUICK_CHIPS = [
  { icon: '⏰', label: '定时任务' },
  { icon: '📁', label: '文件整理' },
  { icon: '📱', label: '社媒发布' },
  { icon: '📊', label: 'AI PPT' },
  { icon: '···', label: '更多' },
]

const EXPERT_GROUPS = [
  {
    id: 'office',
    label: '办公',
    gradient: 'linear-gradient(135deg, #e8f4fd 0%, #d0e8f8 100%)',
    thumb: <OfficeThumbnail />,
  },
  {
    id: 'finance',
    label: '金融',
    gradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    thumb: <FinanceThumbnail />,
  },
  {
    id: 'code',
    label: '编程',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    thumb: <CodeThumbnail />,
  },
]

const PLACEHOLDER = '每天 10:00 为我提供过去 24 小时内科技和科学领域的重点新闻摘要，每条新闻提炼一个核心要点，并附带网络检索来源，确保清晰易读。'

export default function HomePage({ settings, onStartTask }: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const val = input.trim()
    if (!val) return
    onStartTask(val)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    // Tab to fill placeholder
    if (e.key === 'Tab' && !input) {
      e.preventDefault()
      setInput(PLACEHOLDER)
    }
  }

  const workspaceName = settings.workspace.split(/[/\\]/).filter(Boolean).pop() || settings.workspace

  return (
    <div style={styles.page}>
      {/* Credits indicator top-right */}
      <div style={styles.creditsRow}>
        <div style={styles.creditsBadge}>
          <MIcon />
          <span>1200</span>
        </div>
      </div>

      <div style={styles.center}>
        {/* Hero title */}
        <h1 style={styles.heroTitle}>MiniMax Agent，让你的工作更轻松</h1>

        {/* Main input */}
        <div style={{ ...styles.inputBox, ...(focused ? styles.inputBoxFocused : {}) }}>
          <textarea
            ref={textareaRef}
            style={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={PLACEHOLDER}
            rows={3}
          />
          {!input && (
            <div style={styles.tabHint}>
              <kbd style={styles.kbd}>tab</kbd>
            </div>
          )}

          {/* Input toolbar */}
          <div style={styles.inputToolbar}>
            <div style={styles.toolbarLeft}>
              <button style={styles.toolBtn} title="附件">
                <AttachIcon />
              </button>
              <button style={styles.toolBtn} title="更多选项">
                <MenuIcon />
              </button>
              <div style={styles.workspacePill}>
                <FolderIcon />
                <span style={styles.workspaceText}>{workspaceName}</span>
              </div>
            </div>
            <div style={styles.toolbarRight}>
              <span style={styles.modelLabel}>{settings.model.includes('sonnet') ? 'Claude Sonnet' : settings.model.includes('opus') ? 'Claude Opus' : 'Claude Haiku'}</span>
              <button style={styles.toolBtn} title="闪电模式">
                <LightningIcon />
              </button>
              <button style={styles.toolBtn} onClick={() => {}} title="设置">
                <GearIcon />
              </button>
              <button
                style={{ ...styles.sendBtn, ...(input.trim() ? styles.sendBtnActive : {}) }}
                onClick={handleSubmit}
                disabled={!input.trim()}
              >
                <SendIcon active={!!input.trim()} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick chips */}
        <div style={styles.chipsRow}>
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip.label}
              style={styles.chip}
              onClick={() => onStartTask(`帮我${chip.label}`)}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Expert groups */}
        <div style={styles.expertsSection}>
          <div style={styles.expertsSectionHeader}>
            <span style={styles.expertsSectionTitle}>专家套组</span>
            <button style={styles.moreBtn}>
              更多 <ChevronRightIcon />
            </button>
          </div>
          <div style={styles.expertGrid}>
            {EXPERT_GROUPS.map(g => (
              <div key={g.id} style={styles.expertCard}>
                <div style={{ ...styles.expertThumb, background: g.gradient }}>
                  {g.thumb}
                </div>
                <p style={styles.expertLabel}>{g.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright footer */}
      <div style={styles.footer}>
        © 2026 MiniMax
      </div>
    </div>
  )
}

// ─── Thumbnails ───────────────────────────────────────────────────────────────
function OfficeThumbnail() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
      <rect x="20" y="25" width="40" height="50" rx="4" fill="#4caf50" opacity="0.85" />
      <rect x="22" y="27" width="36" height="6" rx="1" fill="white" opacity="0.5" />
      <rect x="22" y="36" width="36" height="2" rx="1" fill="white" opacity="0.3" />
      <rect x="22" y="40" width="24" height="2" rx="1" fill="white" opacity="0.3" />

      <rect x="66" y="20" width="40" height="55" rx="4" fill="#f44336" opacity="0.85" />
      <rect x="68" y="22" width="36" height="6" rx="1" fill="white" opacity="0.5" />

      <rect x="112" y="30" width="40" height="45" rx="4" fill="#2196f3" opacity="0.85" />
      <rect x="114" y="32" width="36" height="6" rx="1" fill="white" opacity="0.5" />

      <rect x="158" y="22" width="40" height="53" rx="4" fill="#1565c0" opacity="0.85" />

      {/* Cursor arrow */}
      <polygon points="100,85 110,100 105,98 105,110 95,110 95,98 90,100" fill="#1a1a1a" opacity="0.6" />
    </svg>
  )
}

function FinanceThumbnail() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
      {/* Folder */}
      <rect x="10" y="35" width="70" height="60" rx="4" fill="#42a5f5" opacity="0.8" />
      <rect x="10" y="28" width="35" height="12" rx="4" fill="#42a5f5" opacity="0.8" />
      <rect x="15" y="50" width="20" height="3" rx="1" fill="white" opacity="0.6" />
      <rect x="15" y="57" width="30" height="3" rx="1" fill="white" opacity="0.4" />
      <text x="42" y="75" fontSize="14" fill="white" fontWeight="bold" opacity="0.9">Finance</text>

      {/* Chart */}
      <rect x="100" y="20" width="90" height="80" rx="6" fill="white" opacity="0.9" />
      <text x="140" y="38" fontSize="16" fill="#4caf50" fontWeight="bold" textAnchor="middle">270%</text>
      <text x="140" y="52" fontSize="8" fill="#999" textAnchor="middle">收益率</text>
      {/* Bar chart */}
      <rect x="108" y="75" width="10" height="20" rx="2" fill="#42a5f5" opacity="0.7" />
      <rect x="122" y="65" width="10" height="30" rx="2" fill="#42a5f5" opacity="0.8" />
      <rect x="136" y="58" width="10" height="37" rx="2" fill="#66bb6a" opacity="0.9" />
      <rect x="150" y="50" width="10" height="45" rx="2" fill="#66bb6a" />
      <rect x="164" y="55" width="10" height="40" rx="2" fill="#42a5f5" opacity="0.7" />
    </svg>
  )
}

function CodeThumbnail() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
      <rect x="10" y="10" width="180" height="100" rx="6" fill="#0d1117" />
      <circle cx="26" cy="24" r="4" fill="#ff5f57" />
      <circle cx="38" cy="24" r="4" fill="#ffbd2e" />
      <circle cx="50" cy="24" r="4" fill="#28c840" />
      <text x="16" y="44" fontSize="7.5" fill="#8b949e" fontFamily="monospace">import requests</text>
      <text x="16" y="55" fontSize="7.5" fill="#8b949e" fontFamily="monospace">url = "https://api.minimax..."</text>
      <text x="16" y="66" fontSize="7.5" fill="#79c0ff" fontFamily="monospace">payload = {'{'}</text>
      <text x="22" y="76" fontSize="7.5" fill="#8b949e" fontFamily="monospace">  "model": "M2.5",</text>
      <text x="22" y="86" fontSize="7.5" fill="#8b949e" fontFamily="monospace">  "messages": [</text>
      <text x="28" y="96" fontSize="7.5" fill="#8b949e" fontFamily="monospace">    {'{'}role: "user"{'}'}</text>
    </svg>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function MIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6.5" fill="#1a1a1a" />
      <text x="7" y="10.5" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">M</text>
    </svg>
  )
}

function AttachIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function LightningIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8">
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

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M4 2 L8 6 L4 10" stroke="#888" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    flex: 1, display: 'flex', flexDirection: 'column',
    background: '#fff', overflow: 'auto',
    position: 'relative',
  },
  creditsRow: {
    display: 'flex', justifyContent: 'flex-end',
    padding: '12px 20px 0',
  },
  creditsBadge: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 13, color: '#333', fontWeight: 500,
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 40px',
    maxWidth: 760,
    margin: '0 auto',
    width: '100%',
    minHeight: 'calc(100vh - 100px)',
    animation: 'fadeUp 0.4s ease',
  },
  heroTitle: {
    fontSize: 28, fontWeight: 600, color: '#1a1a1a',
    marginBottom: 32, letterSpacing: '-0.02em',
    textAlign: 'center',
  },
  inputBox: {
    width: '100%',
    border: '1.5px solid #e8e8e8',
    borderRadius: 14,
    background: '#fff',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    marginBottom: 16,
    position: 'relative',
  },
  inputBoxFocused: {
    border: '1.5px solid #b0b0b0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  textarea: {
    width: '100%', border: 'none', background: 'transparent',
    padding: '16px 16px 0', fontSize: 14, color: '#333',
    resize: 'none', outline: 'none', lineHeight: 1.7,
    fontFamily: "'Noto Sans SC', sans-serif",
    minHeight: 80,
  },
  tabHint: {
    position: 'absolute', top: 16, right: 16, pointerEvents: 'none',
  },
  kbd: {
    fontSize: 10, color: '#bbb', border: '1px solid #e0e0e0',
    borderRadius: 4, padding: '1px 5px',
    background: '#f8f8f8', fontFamily: 'monospace',
  },
  inputToolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px 10px',
    borderTop: '1px solid #f0f0f0',
  },
  toolbarLeft: {
    display: 'flex', alignItems: 'center', gap: 4,
  },
  toolbarRight: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  toolBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center',
    transition: 'background 0.1s',
  },
  workspacePill: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 20,
    border: '1px solid #eee', background: '#fafafa',
    cursor: 'pointer',
    marginLeft: 4,
  },
  workspaceText: {
    fontSize: 12, color: '#666', maxWidth: 160,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  modelLabel: {
    fontSize: 12, color: '#888', fontWeight: 400,
    paddingRight: 4,
  },
  sendBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 2, borderRadius: '50%', display: 'flex', alignItems: 'center',
    transition: 'transform 0.1s',
  },
  sendBtnActive: {
    transform: 'scale(1.05)',
  },
  chipsRow: {
    display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
    marginBottom: 36,
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 20,
    border: '1px solid #e8e8e8', background: '#fff',
    cursor: 'pointer', fontSize: 13, color: '#555',
    transition: 'border-color 0.15s, background 0.15s',
    fontFamily: 'inherit',
  },
  expertsSection: {
    width: '100%',
  },
  expertsSectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  expertsSectionTitle: {
    fontSize: 15, fontWeight: 600, color: '#1a1a1a',
  },
  moreBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, color: '#888', display: 'flex', alignItems: 'center', gap: 3,
    fontFamily: 'inherit',
  },
  expertGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
  },
  expertCard: {
    borderRadius: 12, overflow: 'hidden',
    border: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s, transform 0.15s',
  },
  expertThumb: {
    height: 120, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  expertLabel: {
    padding: '10px 14px',
    fontSize: 13, fontWeight: 500, color: '#333',
    background: '#fff',
  },
  footer: {
    textAlign: 'center', fontSize: 12, color: '#ccc',
    padding: '16px 0 20px', flexShrink: 0,
  },
}
