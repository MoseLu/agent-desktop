import React from 'react'

export interface ChatInputPlaceholderProps {
  value: string
  placeholder: string
  showTabBadge?: boolean
  style?: React.CSSProperties
  animationKey?: string | number
  loading?: boolean
}

export default function ChatInputPlaceholder({
  value,
  placeholder,
  showTabBadge = false,
  style,
  animationKey,
  loading = false,
}: ChatInputPlaceholderProps) {
  if (value) return null

  return (
    <div key={animationKey} style={{ ...styles.placeholderWrapper, ...style }}>
      <span style={styles.placeholderText}>
        {loading ? 'AI 补全中...' : placeholder}
        {showTabBadge && !loading && (
          <>
            {' '}
            <span
              style={styles.tabBadgeInline}
            >
              tab
            </span>
          </>
        )}
      </span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  placeholderWrapper: {
    position: 'absolute',
    top: 16,   // textarea padding-top: 16px (inputContent padding:0，gap≠padding)
    left: 16,  // textarea padding-left: 16px
    right: 16, // textarea padding-right: 16px
    pointerEvents: 'none',
    zIndex: 1,
    overflow: 'hidden',
  },
  placeholderText: {
    fontSize: 14.5,  // 与 textarea 的 fontSize 一致
    color: 'var(--text-tertiary)',
    fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",  // 与 textarea 一致
    lineHeight: 1.7,  // 与 textarea 一致
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    display: 'block',
    animation: 'slideUp 0.3s ease-out',
    margin: 0,  // 确保没有额外的 margin
  },
  tabBadgeInline: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 6px',
    background: 'transparent',
    borderRadius: 8,
    fontSize: 13,
    color: 'var(--text-tertiary)',
    border: '1px solid var(--badge-border)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    cursor: 'default',
    pointerEvents: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    marginLeft: 3,
    verticalAlign: 'baseline',
    height: '1.7em',
    lineHeight: '1.7',
  },
}
