import type { CSSProperties } from 'react'

export const styles: Record<string, CSSProperties> = {
  // Layout — 宽度由外层响应式 wrapper 控制（Sidebar.tsx）
  sidebar: {
    width: '100%',
    height: '100%',
    background: 'var(--sidebar-bg)',
    borderRight: '1px solid var(--sidebar-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
  },
  collapsedSidebar: {
    width: '100%',
    height: '100%',
    background: 'var(--bg-primary)',
    borderRight: '1px solid var(--sidebar-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
  },

  // Top row (logo + collapse button)
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    height: 48,
    boxSizing: 'border-box',
  },
  collapsedTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 0',
    height: 48,
    boxSizing: 'border-box',
    position: 'relative',
  },
  logoContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBtn: {
    width: 32,
    height: 32,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    transition: 'color 0.15s',
  },
  expandIconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
  },
  collapseBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    borderRadius: 6, display: 'flex', alignItems: 'center',
    transition: 'background 0.1s',
    color: 'var(--text-secondary)',
  },

  // Navigation section
  navSection: {
    padding: '0 8px',
    marginBottom: 4,
  },
  navBtn: {
    width: '100%', background: 'none', border: 'none',
    cursor: 'pointer', padding: '8px 10px',
    borderRadius: 8, fontSize: 13.5, color: 'var(--text-primary)',
    display: 'flex', alignItems: 'center', gap: 10,
    textAlign: 'left', fontFamily: 'inherit',
    transition: 'background 0.1s',
    height: 40,
    boxSizing: 'border-box',
  },
  collapsedNavSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '0 8px',
    marginBottom: 4,
  },
  collapsedNavBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    transition: 'background 0.15s, color 0.15s',
    width: 36,
    height: 36,
  },

  // Collapsible header (task records header)
  collapsibleHeader: {
    width: '100%', background: 'none', border: 'none',
    cursor: 'pointer', padding: '8px 18px',
    fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    transition: 'color 0.1s',
  },

  // Task list
  taskList: {
    padding: '2px 8px',
    overflowY: 'auto',
    maxHeight: 280,
  },
  emptyText: {
    fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 12px',
  },
  taskItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, color: 'var(--text-secondary)',
    transition: 'background 0.1s',
  },
  taskItemActive: {
    background: 'var(--selected-bg)',
    color: 'var(--text-primary)',
  },
  taskItemHover: {
    background: 'var(--hover-bg)',
  },
  taskTitle: {
    flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontSize: 12.5,
  },
  taskTitleRunning: {
    background: 'linear-gradient(90deg, var(--text-primary) 0%, var(--text-secondary) 50%, var(--text-primary) 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 2s linear infinite',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  deleteBtn: {
    background: 'none', border: 'none', color: 'var(--text-disabled)',
    cursor: 'pointer', fontSize: 16, padding: '0 2px',
    opacity: 0, transition: 'opacity 0.1s',
    lineHeight: 1,
  },

  // User section
  userSection: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 12px',
    borderTop: '1px solid var(--sidebar-border)',
    height: 48,
    boxSizing: 'border-box',
  },
  userRowWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'var(--accent-gradient)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 600,
    flexShrink: 0,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  userAvatarCollapsed: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--accent-gradient)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'transform 0.15s',
    overflow: 'hidden',
  },
  userAvatarCollapsedWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedBottom: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    height: 48,
    boxSizing: 'border-box',
    borderTop: '1px solid var(--sidebar-border)',
  },
  userRowName: {
    fontSize: 13.5,
    fontWeight: 500,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 120,
  },

  // User menu
  userMenu: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 8,
    width: 220,
    background: 'var(--input-bg)',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--border-dark)',
    overflow: 'hidden',
    zIndex: 1000,
    animation: 'slideIn 0.2s ease-out',
  },
  userMenuCollapsed: {
    position: 'fixed',
    bottom: 58,
    left: 10,
    width: 220,
    background: 'var(--input-bg)',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--border-dark)',
    overflow: 'visible',
    zIndex: 10000,
    animation: 'slideInUp 0.2s ease-out',
  },
  menuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-medium)',
  },
  upgradeBtn: {
    background: 'var(--text-primary)',
    color: 'var(--bg-primary)',
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
    color: 'var(--text-primary)',
    transition: 'background 0.1s',
  },
  menuDivider: {
    height: 1,
    background: 'var(--border-light)',
    margin: '4px 0',
  },

  // Expand tooltip (for collapsed state)
  expandTooltip: {
    position: 'absolute',
    left: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginLeft: 12,
    padding: '8px 12px',
    background: 'var(--bg-primary)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-medium)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
    whiteSpace: 'nowrap',
  },
  tooltipText: {
    fontSize: 13,
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  shortcutBadge: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    background: 'var(--bg-tertiary)',
    padding: '2px 6px',
    borderRadius: 4,
    fontWeight: 500,
    fontFamily: 'monospace',
  },
}

// Animation styles injection
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.id = 'sidebar-animation'
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
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `
  const existing = document.getElementById('sidebar-animation')
  if (!existing) {
    document.head.appendChild(styleElement)
  }
}
