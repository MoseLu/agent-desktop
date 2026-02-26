import React, { useState, useRef, useEffect } from 'react'
import type { Conversation, Settings } from '../types'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  settings: Settings
  onHome: () => void
  onSelect: (id: string) => void
  onNewTask: () => void
  onDelete: (id: string) => void
  onSettings: () => void
}

export default function Sidebar({ conversations, activeId, settings, onHome, onSelect, onNewTask, onDelete, onSettings }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [taskRecordOpen, setTaskRecordOpen] = useState(true)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (collapsed) {
    return (
      <div style={{ ...styles.sidebar, width: 48, padding: '12px 0' }}>
        <button style={styles.collapseBtn} onClick={() => setCollapsed(false)} title="展开侧边栏">
          <CollapseIcon />
        </button>
      </div>
    )
  }

  return (
    <div style={styles.sidebar}>
      {/* Top: Logo + collapse */}
      <div style={styles.topRow}>
        <button style={styles.logoBtn} onClick={onHome}>
          <LogoIcon />
        </button>
        <button style={styles.collapseBtn} onClick={() => setCollapsed(true)} title="折叠">
          <CollapseIcon />
        </button>
      </div>

      {/* Nav actions */}
      <div style={styles.navSection}>
        <button style={styles.navBtn} onClick={onNewTask}>
          <PlusIcon />
          <span>新建任务</span>
        </button>
        <button style={styles.navBtn} onClick={onSettings}>
          <SearchIcon />
          <span>搜索</span>
        </button>
      </div>

      {/* Expert section */}
      <div style={styles.sectionHeader}>专家</div>
      <div style={styles.navSection}>
        <button style={styles.navBtn}>
          <ExpertIcon />
          <span>探索专家</span>
          <span style={styles.newBadge}>New</span>
        </button>
      </div>

      {/* Task records */}
      <button style={styles.collapsibleHeader} onClick={() => setTaskRecordOpen(p => !p)}>
        <span>任务记录</span>
        <ChevronIcon rotated={taskRecordOpen} />
      </button>

      {taskRecordOpen && (
        <div style={styles.taskList}>
          {conversations.length === 0 ? (
            <p style={styles.emptyText}>没有任务记录</p>
          ) : (
            conversations.map(c => (
              <div
                key={c.id}
                style={{
                  ...styles.taskItem,
                  ...(c.id === activeId ? styles.taskItemActive : {}),
                  ...(hoverId === c.id ? styles.taskItemHover : {}),
                }}
                onClick={() => onSelect(c.id)}
                onMouseEnter={() => setHoverId(c.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <TaskIcon />
                <span style={styles.taskTitle}>{c.title}</span>
                <button
                  style={styles.deleteBtn}
                  onClick={e => { e.stopPropagation(); onDelete(c.id) }}
                >×</button>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* User profile - centered horizontally */}
      <div style={styles.userSection}>
        <div style={styles.userRowWrapper} ref={userMenuRef}>
          <div
            style={styles.userRow}
            onClick={() => setUserMenuOpen(p => !p)}
            title="点击打开菜单"
          >
            <div style={styles.userAvatar}>
              {settings.userName.charAt(0)}
            </div>
            <div style={styles.userTextSection}>
              <div style={styles.userRowName}>{settings.userName}</div>
              <div style={styles.userRowPlan}>{settings.userPlan}</div>
            </div>
          </div>

          {/* Floating user menu */}
          {userMenuOpen && (
            <div style={styles.userMenu}>
              <div style={styles.menuHeader}>
                <span style={{ fontWeight: 500 }}>个人</span>
                <button style={styles.upgradeBtn}>升级</button>
              </div>
              
              <div style={styles.menuItem} onClick={() => { setUserMenuOpen(false); onSettings() }}>
                <SettingsIcon />
                <span>设置</span>
              </div>
              
              <div style={styles.menuItem}>
                <ContactIcon />
                <span>联系我们</span>
                <ChevronIcon rotated={false} style={{ transform: 'rotate(-90deg)', marginLeft: 'auto', width: 10, height: 10 }} />
              </div>
              
              <div style={styles.menuItem}>
                <InfoIcon />
                <span>了解更多</span>
                <ChevronIcon rotated={false} style={{ transform: 'rotate(-90deg)', marginLeft: 'auto', width: 10, height: 10 }} />
              </div>
              
              <div style={styles.menuDivider} />
              
              <div style={styles.menuItem} onClick={() => setUserMenuOpen(false)}>
                <LogoutIcon />
                <span style={{ color: '#ff4444' }}>退出登录</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Icons
function LogoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect width="22" height="22" rx="5" fill="#1a1a1a" />
      <path d="M5 11 L9 7 L13 11 L9 15Z" fill="white" opacity="0.9" />
      <path d="M10 11 L14 7 L18 11 L14 15Z" fill="white" opacity="0.5" />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="2" rx="1" fill="#999" />
      <rect x="2" y="7" width="12" height="2" rx="1" fill="#999" />
      <rect x="2" y="11" width="12" height="2" rx="1" fill="#999" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.5" stroke="#555" strokeWidth="1.2" />
      <line x1="7.5" y1="4.5" x2="7.5" y2="10.5" stroke="#555" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="4.5" y1="7.5" x2="10.5" y2="7.5" stroke="#555" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="5" stroke="#555" strokeWidth="1.3" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="#555" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ExpertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#555" />
      <rect x="8" y="1" width="6" height="6" rx="1.5" fill="#555" opacity="0.5" />
      <rect x="1" y="8" width="6" height="6" rx="1.5" fill="#555" opacity="0.5" />
      <rect x="8" y="8" width="6" height="6" rx="1.5" fill="#555" />
    </svg>
  )
}

function TaskIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5 Q2 2 3.5 2 L10.5 2 Q12 2 12 3.5 L12 10.5 Q12 12 10.5 12 L3.5 12 Q2 12 2 10.5Z" stroke="#999" strokeWidth="1" fill="none" />
      <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="#bbb" strokeWidth="1" strokeLinecap="round" />
      <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="#bbb" strokeWidth="1" strokeLinecap="round" />
      <line x1="4.5" y1="10" x2="7" y2="10" stroke="#bbb" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon({ rotated, style }: { rotated: boolean; style?: React.CSSProperties }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: rotated ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', ...style }}>
      <path d="M2 4 L6 8 L10 4" stroke="#999" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="#666" strokeWidth="1.2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M2.9 13.1l1.4-1.4M11.7 4.3l1.4-1.4" stroke="#666" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ContactIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2C5.5 2 3.5 3.8 3.5 6c0 1.3.7 2.5 1.8 3.3L4 13l3.5-1.5c.5.1 1 .2 1.5.2 2.5 0 4.5-1.8 4.5-4S11.5 2 8 2z" stroke="#666" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="#666" strokeWidth="1.2" />
      <circle cx="8" cy="5" r="0.8" fill="#666" />
      <line x1="8" y1="7" x2="8" y2="11" stroke="#666" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M9 3h4v10H9" stroke="#ff4444" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8h10M10 5l3 3-3 3" stroke="#ff4444" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 240,
    background: '#fafafa',
    borderRight: '1px solid #efefef',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    padding: '0 0 0 0',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 14px 10px',
  },
  logoBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
    display: 'flex', alignItems: 'center',
  },
  collapseBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    borderRadius: 6, display: 'flex', alignItems: 'center',
    transition: 'background 0.1s',
  },
  navSection: {
    padding: '0 8px',
    marginBottom: 4,
  },
  navBtn: {
    width: '100%', background: 'none', border: 'none',
    cursor: 'pointer', padding: '8px 10px',
    borderRadius: 8, fontSize: 13.5, color: '#333',
    display: 'flex', alignItems: 'center', gap: 10,
    textAlign: 'left', fontFamily: 'inherit',
    transition: 'background 0.1s',
  },
  sectionHeader: {
    fontSize: 11, color: '#aaa', fontWeight: 500,
    padding: '10px 18px 4px',
    letterSpacing: '0.03em',
  },
  newBadge: {
    marginLeft: 'auto',
    fontSize: 10, fontWeight: 600,
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white', padding: '1px 6px', borderRadius: 10,
  },
  collapsibleHeader: {
    width: '100%', background: 'none', border: 'none',
    cursor: 'pointer', padding: '8px 18px',
    fontSize: 12, color: '#888', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    transition: 'color 0.1s',
  },
  taskList: {
    padding: '2px 8px',
    overflowY: 'auto',
    maxHeight: 280,
  },
  emptyText: {
    fontSize: 12, color: '#bbb', padding: '8px 12px',
  },
  taskItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, color: '#555',
    transition: 'background 0.1s',
  },
  taskItemActive: {
    background: '#f0f0f0',
    color: '#1a1a1a',
  },
  taskItemHover: {
    background: '#f5f5f5',
  },
  taskTitle: {
    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontSize: 12.5,
  },
  deleteBtn: {
    background: 'none', border: 'none', color: '#ccc',
    cursor: 'pointer', fontSize: 16, padding: '0 2px',
    opacity: 0, transition: 'opacity 0.1s',
    lineHeight: 1,
  },
  userSection: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 0',
    borderTop: '1px solid #efefef',
  },
  userRowWrapper: {
    position: 'relative',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 600,
    flexShrink: 0,
  },
  userTextSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflow: 'hidden',
  },
  userRowName: {
    fontSize: 13.5,
    fontWeight: 500,
    color: '#333',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRowPlan: {
    fontSize: 11,
    color: '#999',
  },
  userMenu: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 8,
    width: 240,
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    zIndex: 1000,
    animation: 'slideIn 0.2s ease-out',
  },
  menuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    background: '#fafafa',
  },
  upgradeBtn: {
    background: '#1a1a1a',
    color: 'white',
    border: 'none',
    borderRadius: 16,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    cursor: 'pointer',
    fontSize: 13.5,
    color: '#333',
    transition: 'background 0.1s',
  },
  menuDivider: {
    height: 1,
    background: '#f0f0f0',
    margin: '4px 0',
  },
}

// Add animation styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.id = 'user-menu-animation'
  styleElement.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `
  const existing = document.getElementById('user-menu-animation')
  if (!existing) {
    document.head.appendChild(styleElement)
  }
}
