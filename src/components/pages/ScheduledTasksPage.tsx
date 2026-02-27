import React from 'react'
import { InfoIcon, AlarmCheckIcon } from '@ui'

interface Props {
  onBack?: () => void
}

export default function ScheduledTasksPage({ onBack }: Props) {
  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>定时任务</span>
          <InfoIcon size={15} style={styles.infoIcon} />
        </div>
        {onBack && (
          <button style={styles.closeBtn} onClick={onBack}>×</button>
        )}
      </div>

      {/* Warning banner */}
      <div style={styles.warning}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#d97706" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
          <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="8" cy="11.5" r="0.6" fill="#d97706" />
        </svg>
        <span style={styles.warningText}>
          请保持电脑开机并运行客户端，否则在关机、休眠或退出客户端时，定时任务将无法自动执行。
        </span>
      </div>

      {/* Empty state */}
      <div style={styles.emptyState}>
        <div style={styles.clockIcon}>
          <AlarmCheckIcon size={56} style={{ color: 'var(--text-tertiary)', opacity: 0.35 }} />
        </div>
        <div style={styles.emptyTitle}>开始添加定时任务</div>
        <div style={styles.emptyDesc}>安排未来任务，让MiniMax代理按时处理您的日常工作。</div>
        <button style={styles.addBtn}>
          <span style={{ fontSize: 16, lineHeight: 1, marginRight: 4 }}>+</span>
          新建定时任务
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-primary)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 28px',
    borderBottom: '1px solid var(--border-light)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  infoIcon: {
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: 26,
    lineHeight: 1,
    padding: '4px 6px',
  },
  warning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    margin: '16px 28px',
    padding: '11px 14px',
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(217, 119, 6, 0.25)',
    borderRadius: 8,
    flexShrink: 0,
  },
  warningText: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.55,
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '0 28px 60px',
  },
  clockIcon: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  emptyDesc: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 1.55,
    marginBottom: 8,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 8,
    padding: '10px 22px',
    background: 'var(--text-primary)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
