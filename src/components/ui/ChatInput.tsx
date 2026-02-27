import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react'

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder?: string
  disabled?: boolean
  renderToolbar?: () => React.ReactNode
  renderExtraContent?: () => React.ReactNode
  renderHeader?: () => React.ReactNode
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  className?: string
  style?: React.CSSProperties
  minRows?: number
  maxRows?: number
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  disabled = false,
  renderToolbar,
  renderExtraContent,
  renderHeader,
  onKeyDown,
  className = '',
  style,
  minRows = 3,
  maxRows = 8,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 合并样式
  const combinedStyle: React.CSSProperties = {
    ...styles.inputBox,
    ...style,
  }

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const lineHeight = 24.65 // 14.5px * 1.7
    const maxHeight = maxRows * lineHeight
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${Math.max(newHeight, minRows * lineHeight)}px`
  }, [value, minRows, maxRows])

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault()
      const trimmed = value.trim()
      if (trimmed) {
        onSubmit(trimmed)
      }
    } else if (onKeyDown) {
      onKeyDown(e)
    }
  }

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed && !disabled) {
      onSubmit(trimmed)
    }
  }

  return (
    <div className={className} style={combinedStyle}>
      {/* 自定义头部内容（如果有） */}
      {renderHeader?.()}
      
      <div style={styles.inputContent}>
        {renderExtraContent?.()}
        
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={minRows}
        />
        
        {renderToolbar?.()}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  inputBox: {
    width: '100%',
    border: '1px solid var(--border-medium)',
    borderRadius: 16,
    background: 'var(--input-bg)',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  inputContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 0,
  },
  textarea: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    padding: '16px',
    fontSize: 14.5,
    color: 'var(--text-primary)',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.7,
    fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    minHeight: 'calc(14.5px * 1.7 * 3)',
    boxSizing: 'border-box',
    verticalAlign: 'top',
    alignSelf: 'flex-start',
  },
}
