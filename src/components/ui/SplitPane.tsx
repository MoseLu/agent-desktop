import React, { useState, useRef, useEffect, useCallback } from 'react'

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  /** Initial left pane percentage (0–100), default 62 */
  defaultLeftPercent?: number
  /** Minimum left pane width in px */
  minLeft?: number
  /** Minimum right pane width in px */
  minRight?: number
  style?: React.CSSProperties
}

export default function SplitPane({
  left,
  right,
  defaultLeftPercent = 62,
  minLeft = 320,
  minRight = 280,
  style,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent)
  const dragging = useRef(false)

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const totalWidth = rect.width
      if (totalWidth === 0) return
      const offsetX = e.clientX - rect.left
      const minLeftPct = (minLeft / totalWidth) * 100
      const maxLeftPct = 100 - (minRight / totalWidth) * 100
      const newPct = Math.min(maxLeftPct, Math.max(minLeftPct, (offsetX / totalWidth) * 100))
      setLeftPercent(newPct)
    }

    const onMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [minLeft, minRight])

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', ...style }}
    >
      {/* Left pane */}
      <div
        style={{
          width: `${leftPercent}%`,
          minWidth: minLeft,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {left}
      </div>

      {/* Draggable divider */}
      <div
        onMouseDown={onDividerMouseDown}
        style={dividerStyle}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-secondary, #1677ff)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--border-medium)' }}
      />

      {/* Right pane */}
      <div
        style={{
          flex: 1,
          minWidth: minRight,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {right}
      </div>
    </div>
  )
}

const dividerStyle: React.CSSProperties = {
  width: 4,
  flexShrink: 0,
  cursor: 'col-resize',
  background: 'var(--border-medium)',
  transition: 'background 0.15s',
  position: 'relative',
  zIndex: 10,
}
