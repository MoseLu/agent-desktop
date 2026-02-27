import React from 'react'

export interface ChatInputToolbarProps {
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  style?: React.CSSProperties
}

export default function ChatInputToolbar({
  leftContent,
  rightContent,
  style,
}: ChatInputToolbarProps) {
  return (
    <div style={{ ...styles.toolbar, ...style }}>
      {leftContent && (
        <div style={styles.toolbarLeft}>
          {leftContent}
        </div>
      )}
      {rightContent && (
        <div style={styles.toolbarRight}>
          {rightContent}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px 10px',
    gap: 12,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
}
