import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { TaskListProps, TaskItemProps } from '../Sidebar.types'
import { styles } from '../Sidebar.styles'
import { TaskIcon, ChevronIcon } from '@ui'
import { EllipsisOutlined, ShareAltOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Dropdown, type MenuProps, message } from 'antd'

interface TaskItemWithMenuProps extends TaskItemProps {
  onRename: (id: string, newTitle: string) => void
  onCopyId: (id: string) => void
}

function TaskItem({ conversation, isActive, isHovered, onSelect, onDelete, onHoverChange, onRename, onCopyId }: TaskItemWithMenuProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conversation.title)
  const [menuBtnHovered, setMenuBtnHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 检查任务是否正在进行
  const isRunning = conversation.messages.some(msg => msg.streaming)

  // 编辑模式下自动聚焦
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleShare = useCallback(() => {
    onCopyId(conversation.id)
  }, [onCopyId, conversation.id])

  const handleRename = useCallback(() => {
    setEditing(true)
  }, [])

  const handleDelete = useCallback(() => {
    onDelete()
  }, [onDelete])

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.stopPropagation()
      if (editTitle.trim()) {
        onRename(conversation.id, editTitle.trim())
      }
      setEditing(false)
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setEditing(false)
      setEditTitle(conversation.title)
    }
  }

  const handleInputBlur = () => {
    if (editTitle.trim()) {
      onRename(conversation.id, editTitle.trim())
    } else {
      setEditTitle(conversation.title)
    }
    setEditing(false)
  }

  // Dropdown 菜单项 — memoized，仅在回调变化时重建
  const menuItems = useMemo<MenuProps['items']>(() => [
    {
      key: 'share',
      icon: <ShareAltOutlined />,
      label: '分享',
      onClick: handleShare,
    },
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: '重命名',
      onClick: handleRename,
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined style={{ color: 'var(--error)' }} />,
      label: <span style={{ color: 'var(--error)' }}>删除</span>,
      onClick: handleDelete,
    },
  ], [handleShare, handleRename, handleDelete])

  return (
    <div
      key={conversation.id}
      style={{
        ...styles.taskItem,
        ...(isActive ? styles.taskItemActive : {}),
        ...(isHovered ? styles.taskItemHover : {}),
        position: 'relative',
      }}
      onClick={onSelect}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <TaskIcon />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          style={{
            flex: 1,
            border: '1px solid var(--border-medium)',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 12.5,
            color: 'var(--text-primary)',
            background: 'var(--input-bg)',
            outline: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span style={{
          ...styles.taskTitle,
          ...(isRunning ? styles.taskTitleRunning : {}),
        }}>
          {conversation.title}
        </span>
      )}
      {/* 三点菜单按钮 - hover 时可见，始终占位防止文字抖动 */}
      <div
        style={{
          visibility: isHovered ? 'visible' : 'hidden',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Dropdown
          menu={{
            items: menuItems,
            style: {
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid var(--border-medium)',
            }
          }}
          trigger={['click']}
          placement="bottomRight"
          getPopupContainer={() => document.body}
          styles={{
            root: {
              minWidth: 120,
            }
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: 4,
              color: menuBtnHovered ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: menuBtnHovered ? 'var(--hover-bg)' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
              fontSize: 16,
            }}
            onMouseEnter={() => setMenuBtnHovered(true)}
            onMouseLeave={() => setMenuBtnHovered(false)}
          >
            <EllipsisOutlined />
          </div>
        </Dropdown>
      </div>
    </div>
  )
}

export function TaskList({ conversations, activeId, isOpen, onSelect, onDelete, onToggle }: TaskListProps) {
  const [hoverId, setHoverId] = React.useState<string | null>(null)

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      message.success('已复制分享链接')
    } catch (err) {
      console.error('复制失败:', err)
      message.error('复制失败')
    }
  }

  const handleRename = (id: string, newTitle: string) => {
    // TODO: 调用后端 API 更新任务标题
    console.log('重命名任务:', id, newTitle)
    message.success('重命名成功')
  }

  return (
    <>
      <button style={styles.collapsibleHeader} onClick={onToggle}>
        <span>任务记录</span>
        <ChevronIcon style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div style={styles.taskList}>
          {conversations.length === 0 ? (
            <p style={styles.emptyText}>没有任务记录</p>
          ) : (
            conversations.map(conversation => (
              <TaskItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeId}
                isHovered={hoverId === conversation.id}
                onSelect={() => onSelect(conversation.id)}
                onDelete={() => onDelete(conversation.id)}
                onHoverChange={hovered => setHoverId(hovered ? conversation.id : null)}
                onCopyId={handleCopyId}
                onRename={handleRename}
              />
            ))
          )}
        </div>
      )}
    </>
  )
}
