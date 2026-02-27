import React, { useState, useMemo } from 'react'
import type { Conversation } from '@types'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}

export default function SearchModal({ conversations, activeId, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')

  // 搜索匹配的会话
  const filteredConversations = useMemo(() => {
    if (!query.trim()) return conversations
    
    const searchQuery = query.toLowerCase()
    return conversations.filter(c => 
      c.title.toLowerCase().includes(searchQuery) ||
      c.messages.some(m => m.content.toLowerCase().includes(searchQuery))
    )
  }, [query, conversations])

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerTitle}>搜索</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.searchBox}>
          <input
            type="text"
            style={styles.input}
            placeholder="搜索会话标题或内容..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div style={styles.results}>
          {filteredConversations.length === 0 ? (
            query.trim() ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🔍</div>
                <div style={styles.emptyText}>未找到匹配的会话</div>
                <div style={styles.emptyDesc}>尝试其他关键词</div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>💬</div>
                <div style={styles.emptyText}>输入关键词开始搜索</div>
                <div style={styles.emptyDesc}>搜索会话标题或消息内容</div>
              </div>
            )
          ) : (
            filteredConversations.map(c => (
              <div
                key={c.id}
                style={{
                  ...styles.resultItem,
                  ...(c.id === activeId ? styles.resultItemActive : {}),
                }}
                onClick={() => { onSelect(c.id); onClose() }}
              >
                <div style={styles.resultIcon}>💬</div>
                <div style={styles.resultContent}>
                  <div style={styles.resultTitle}>{c.title}</div>
                  <div style={styles.resultPreview}>
                    {c.messages[c.messages.length - 1]?.content?.slice(0, 50)}
                    {c.messages[c.messages.length - 1]?.content?.length > 50 ? '...' : ''}
                  </div>
                  <div style={styles.resultTime}>
                    {new Date(c.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: 600,
    maxHeight: '80vh',
    background: 'var(--bg-primary)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-xl)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-light)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: 24,
    lineHeight: 1,
    padding: '4px 8px',
  },
  searchBox: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-light)',
  },
  input: {
    width: '100%',
    border: '1px solid var(--border-medium)',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 14,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    background: 'var(--bg-primary)',
    boxSizing: 'border-box',
  },
  results: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  resultItem: {
    display: 'flex',
    gap: 12,
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    borderBottom: '1px solid var(--border-light)',
  },
  resultItemActive: {
    background: 'var(--bg-secondary)',
  },
  resultIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  resultContent: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  resultPreview: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultTime: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--text-tertiary)',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
  },
}
