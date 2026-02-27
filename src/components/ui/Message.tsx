import React, { useEffect } from 'react'
import { InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'

export type MessageType = 'info' | 'success' | 'error' | 'warning'

interface MessageProps {
  type?: MessageType
  content: string
  duration?: number
  onClose?: () => void
}

interface MessageInstance {
  info: (content: string, duration?: number) => void
  success: (content: string, duration?: number) => void
  error: (content: string, duration?: number) => void
  warning: (content: string, duration?: number) => void
}

const MessageContainer: React.FC<{
  messages: Array<{
    id: string
    type: MessageType
    content: string
    duration?: number
  }>
  onRemove: (id: string) => void
}> = ({ messages, onRemove }) => {
  return (
    <div style={styles.container}>
      {messages.map(msg => (
        <MessageItem key={msg.id} {...msg} onRemove={() => onRemove(msg.id)} />
      ))}
    </div>
  )
}

const MessageItem: React.FC<{
  id: string
  type: MessageType
  content: string
  duration?: number
  onRemove: () => void
}> = ({ type, content, duration, onRemove }) => {
  useEffect(() => {
    if (duration !== 0) {
      const timer = setTimeout(() => {
        onRemove()
      }, duration || 3000)
      return () => clearTimeout(timer)
    }
  }, [duration, onRemove])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  return (
    <div style={{ ...styles.message, ...styles[`message${type.charAt(0).toUpperCase() + type.slice(1)}`] }}>
      <span style={styles.icon}>{getIcon()}</span>
      <span style={styles.content}>{content}</span>
    </div>
  )
}

let messageContainer: HTMLDivElement | null = null
let messageQueue: Array<{
  id: string
  type: MessageType
  content: string
  duration?: number
}> = []

const createMessage = () => {
  if (!messageContainer) {
    messageContainer = document.createElement('div')
    messageContainer.style.position = 'fixed'
    messageContainer.style.top = '24px'
    messageContainer.style.left = '50%'
    messageContainer.style.transform = 'translateX(-50%)'
    messageContainer.style.zIndex = '9999'
    messageContainer.style.display = 'flex'
    messageContainer.style.flexDirection = 'column'
    messageContainer.style.gap = '8px'
    messageContainer.style.pointerEvents = 'none'
    document.body.appendChild(messageContainer)
  }
  
  const render = async () => {
    if (messageContainer) {
      // 使用 React 18 的 createRoot
      const root = (messageContainer as any)._reactRoot
      if (!root) {
        const { createRoot } = await import('react-dom/client')
        ;(messageContainer as any)._reactRoot = createRoot(messageContainer)
      }
      ;(messageContainer as any)._reactRoot.render(
        <MessageContainer
          messages={messageQueue}
          onRemove={(id) => {
            messageQueue = messageQueue.filter(m => m.id !== id)
            render()
          }}
        />
      )
    }
  }

  return {
    info: (content: string, duration?: number) => {
      const id = `msg_${Date.now()}_${Math.random()}`
      messageQueue.push({ id, type: 'info', content, duration })
      render().catch(console.error)
    },
    success: (content: string, duration?: number) => {
      const id = `msg_${Date.now()}_${Math.random()}`
      messageQueue.push({ id, type: 'success', content, duration })
      render().catch(console.error)
    },
    error: (content: string, duration?: number) => {
      const id = `msg_${Date.now()}_${Math.random()}`
      messageQueue.push({ id, type: 'error', content, duration })
      render().catch(console.error)
    },
    warning: (content: string, duration?: number) => {
      const id = `msg_${Date.now()}_${Math.random()}`
      messageQueue.push({ id, type: 'warning', content, duration })
      render().catch(console.error)
    },
  }
}

export const message: MessageInstance = createMessage()

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  message: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 8,
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.12)',
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.85)',
    background: 'white',
    minWidth: 200,
    maxWidth: 400,
    pointerEvents: 'auto',
    animation: 'slideDown 0.3s ease',
  },
  messageInfo: {
    background: 'white',
    border: '1px solid #e8e8e8',
  },
  messageSuccess: {
    background: '#f6ffed',
    border: '1px solid #b7eb8f',
  },
  messageError: {
    background: '#fff2f0',
    border: '1px solid #ffccc7',
  },
  messageWarning: {
    background: '#fffbe6',
    border: '1px solid #ffe58f',
  },
  icon: {
    fontSize: 16,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
}

// 添加动画样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `
  document.head.appendChild(style)
}
