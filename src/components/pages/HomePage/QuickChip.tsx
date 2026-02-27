import React from 'react'

interface QuickChipProps {
  icon: React.ReactNode
  label: string
  color?: string
  onClick?: () => void
}

export default function QuickChip({ icon, label, color, onClick }: QuickChipProps) {
  return (
    <button
      style={styles.chip}
      onClick={onClick}
    >
      <span style={{ ...styles.iconWrapper, color }}>
        {icon}
      </span>
      <span style={styles.label}>{label}</span>
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    borderRadius: 20,
    border: '1px solid var(--input-border)',
    background: 'var(--bg-primary)',
    cursor: 'pointer',
    fontSize: 13.5,
    color: 'var(--text-secondary)',
    transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
    fontFamily: 'inherit',
    height: 42,
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    flexShrink: 0,
  },
  label: {
    fontWeight: 500,
  },
}
