import React, { useState, useRef, useEffect } from 'react'
import type { Settings } from '@types'
import IconButton from '@ui/IconButton'
import ChatInput from '@ui/ChatInput'
import ChatInputToolbar from '@ui/ChatInputToolbar'
import ChatInputPlaceholder from '@ui/ChatInputPlaceholder'
import Tooltip from '@ui/Tooltip'
import { isElectron } from '@utils/env'
import { message } from '@ui/Message'
import {
  AttachIcon,
  SlidersIcon,
  FolderIcon,
  LightningIcon,
  OmnipotentModeIcon as OmnipotentIcon,
  AlarmCheckIcon,
  ClipboardCheckIcon,
  BroadcastIcon,
  PresentationIcon,
} from '@ui/icons'
import { ArrowUpOutlined } from '@ant-design/icons'
import QuickChip from './HomePage/QuickChip'

interface Props {
  settings: Settings
  onStartTask: (prompt?: string, smartMode?: boolean) => void
}

// 自定义 SVG 图标组件
function AlarmClockIcon({ size = 14, color = '#8B5CF6' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 闹钟主体 */}
      <circle cx="12" cy="13" r="8" stroke={color} strokeWidth="2" fill="none" />
      {/* 闹钟腿 */}
      <path d="M7 19L5 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M17 19L19 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* 闹钟铃铛 */}
      <path d="M8 5L10 3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M16 5L14 3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* 时针 */}
      <path d="M12 13V9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* 分针 */}
      <path d="M12 13L15 13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function DocumentIcon({ size = 14, color = '#F97316' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 文档轮廓 */}
      <path d="M6 2L18 2L18 22L6 22L6 2Z" stroke={color} strokeWidth="2" fill="none" />
      {/* 折角 */}
      <path d="M6 2L6 8L12 8L12 2" stroke={color} strokeWidth="2" fill="none" />
      {/* 文档线条 */}
      <path d="M8 12L16 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 16L16 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 20L14 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function RadarIcon({ size = 14, color = '#EF4444' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 雷达外圈 */}
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
      {/* 雷达中圈 */}
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* 雷达内圈 */}
      <circle cx="12" cy="12" r="2" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" />
      {/* 雷达扫描线 */}
      <path d="M12 12L18 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* 雷达底座 */}
      <path d="M12 21L12 17" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 21L16 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function WhiteboardIcon({ size = 14, color = '#3B82F6' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 白板主体 */}
      <rect x="3" y="3" width="18" height="14" rx="2" stroke={color} strokeWidth="2" fill="none" />
      {/* 白板支架 */}
      <path d="M7 17L5 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M17 17L19 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 21L14 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* 白板内容线 */}
      <path d="M6 7L14 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 10L12 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 13L10 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const QUICK_CHIPS = [
  { icon: AlarmCheckIcon, label: '定时任务', color: 'var(--color-purple-500)' },
  { icon: ClipboardCheckIcon, label: '文件整理', color: 'var(--color-orange-500)' },
  { icon: BroadcastIcon, label: '社媒发布', color: 'var(--color-red-500)' },
  { icon: PresentationIcon, label: 'AI PPT', color: 'var(--color-blue-500)' },
]

// 图标尺寸配置
const ICON_SIZE = 20

// Placeholder 文本轮播列表
const PLACEHOLDERS = [
  '每天 10:00 为我提供过去 24 小时内科技和科学领域的重点新闻摘要。每条新闻提炼一个核心要点，并附带网络检索来源，确保清晰易读。',
  '下载文件夹：帮我按照文件类型整理下载文件夹里的内容。',
  '职位搜集：帮我在 Boss 直聘搜索上海的 AI 产品经理岗位，筛选月薪 30k 以上的职位，并整理成表格。',
  '我要给初中生做一个中世纪历史的 PPT，得让他们真的能听进去。要解释清楚、配图到位、举的例子能让他们产生共鸣，再加几道题检验下理解程度。',
]

export default function HomePage({ settings, onStartTask }: Props) {
  const [input, setInput] = useState('')
  const [isSmartMode, setIsSmartMode] = useState(false)
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0)
  const [key, setKey] = useState(0) // 用于触发动画
  const [isSelectingFolder, setIsSelectingFolder] = useState(false)
  const [isHoveringWorkspace, setIsHoveringWorkspace] = useState(false)
  const [workspace, setWorkspace] = useState(settings.workspace || '未设置工作目录')
  const workspaceBtnRef = useRef<HTMLDivElement>(null)
  const efficientModeBtnRef = useRef<HTMLButtonElement>(null)
  const omnipotentModeBtnRef = useRef<HTMLButtonElement>(null)
  const currentPlaceholder = PLACEHOLDERS[currentPlaceholderIndex]

  // 监听工作目录变化事件
  useEffect(() => {
    const handleWorkspaceChanged = (event: CustomEvent<string>) => {
      const newWorkspace = event.detail
      setWorkspace(newWorkspace)
    }

    window.addEventListener('workspace-changed', handleWorkspaceChanged as EventListener)

    return () => {
      window.removeEventListener('workspace-changed', handleWorkspaceChanged as EventListener)
    }
  }, [])

  // Placeholder 轮播
  useEffect(() => {
    if (input) return // 有输入时不轮播
    
    const interval = setInterval(() => {
      setKey(prev => prev + 1) // 先增加 key 触发动画
      setCurrentPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length)
    }, 4000) // 每 4 秒切换一次
    
    return () => clearInterval(interval)
  }, [input])

  const handleSubmit = (val: string) => {
    onStartTask(val, isSmartMode)
  }

  const handleTabClick = () => {
    setInput(currentPlaceholder)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !input) {
      e.preventDefault()
      handleTabClick()
    }
  }

  const handleSelectWorkspace = async () => {
    if (isSelectingFolder) return
    setIsSelectingFolder(true)
    
    try {
      if (!isElectron()) {
        message.warning('网页版本暂不支持文件夹选择功能', 3000)
        return
      }
      
      const selectedPath = await window.electron.pickFolder()
      if (selectedPath) {
        // 保存新的工作目录设置
        await window.electron.saveSettings({ workspace: selectedPath })
        // 触发自定义事件通知应用其他部分工作目录已更改
        window.dispatchEvent(new CustomEvent('workspace-changed', { detail: selectedPath }))
        message.success(`工作目录已更新`, 2000)
      }
    } catch (error) {
      console.error('选择工作目录失败:', error)
      message.error('选择工作目录失败', 3000)
    } finally {
      setIsSelectingFolder(false)
    }
  }

  const formatModelName = (modelName: string) => {
    if (modelName.includes('sonnet')) return 'Claude Sonnet'
    if (modelName.includes('opus')) return 'Claude Opus'
    if (modelName.includes('haiku')) return 'Claude Haiku'
    return modelName
  }

  const workspaceName = workspace || '未设置工作目录'

  return (
    <div style={styles.page}>
      {/* 注入动画样式 */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes sparkle-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes sparkle-home {
          0%, 100% {
            opacity: 0;      // 完全隐藏
          }
          30% {
            opacity: 1;      // 完全显示（最亮）
          }
          70% {
            opacity: 1;      // 保持亮度
          }
        }
      `}</style>
      
      <div style={styles.center}>
        {/* 标题和点阵在同一容器，通过层级控制重叠 */}
        <div style={styles.titleContainer}>
          {/* 闪烁点效果 - 等腰梯形点阵，随机闪烁流动效果 */}
          <div style={styles.sparkleBackground}>
          {/* 生成等腰梯形分布的点阵：上底窄（标题宽度），下底宽（输入框宽度） */}
          {(() => {
            const dots = []
            const totalRows = 12
            const topWidth = 320      // 上底宽度（标题宽度约 300-350px）
            const bottomWidth = 800   // 下底宽度（输入框宽度约 800px）
            const rowGap = 6          // 行间距
            const containerHeight = (totalRows - 1) * rowGap  // 实际高度：66px
            const pointsPerRow = 20   // 每行固定点数
            
            for (let row = 0; row < totalRows; row++) {
              // 线性插值计算当前行宽度（上底 → 下底）
              const rowWidth = topWidth + (bottomWidth - topWidth) * (row / (totalRows - 1))
              
              // 计算点间距
              const colGap = rowWidth / (pointsPerRow - 1)
              
              // 居中排列
              const startX = (bottomWidth - rowWidth) / 2
              
              for (let col = 0; col < pointsPerRow; col++) {
                const x = startX + col * colGap
                const y = row * rowGap
                
                // 梯形效果：通过透明度控制，两侧透明度高（更淡），中间透明度低（更亮）
                const centerCol = (pointsPerRow - 1) / 2
                const distanceFromRowCenter = Math.abs(col - centerCol)
                const maxRowDistance = centerCol
                const baseOpacity = 0.3 + (1 - distanceFromRowCenter / maxRowDistance) * 0.7  // 0.3-1.0
                
                // 随机动画参数，形成流动效果
                const randomDelay = Math.random() * 3  // 0-3s 随机延迟
                const randomDuration = 1 + Math.random() * 2  // 1-3s 随机周期
                
                dots.push(
                  <span
                    key={`${row}-${col}`}
                    style={{
                      ...styles.sparkleDot,
                      left: `${x}px`,
                      top: `${y}px`,
                      opacity: baseOpacity,
                      animationDelay: `${randomDelay}s`,
                      animationDuration: `${randomDuration}s`,
                    }}
                  />
                )
              }
            }
            return dots
          })()}
          </div>
          
          {/* Hero title - 在上层，与点阵重叠 */}
          <h1 style={styles.heroTitle}>Agent Desktop，让你的工作更轻松</h1>
        </div>

        {/* Main input */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          style={{ marginBottom: 16 }}
          renderExtraContent={() => (
            <>
              {/* 自定义 placeholder */}
              <ChatInputPlaceholder
                key={key}
                value={input}
                placeholder={currentPlaceholder}
                showTabBadge
              />
            </>
          )}
          renderToolbar={() => (
            <ChatInputToolbar
              leftContent={(
                <>
                  <IconButton 
                    variant="bordered" 
                    icon={<AttachIcon />} 
                    title="附件"
                  />
                  <IconButton 
                    variant="bordered" 
                    icon={<SlidersIcon />} 
                    title="更多选项"
                  />
                  {isElectron() && (
                    <Tooltip title={settings.workspace ? `工作目录：${settings.workspace}` : '点击选择工作目录'} position="bottom">
                      <div 
                        ref={workspaceBtnRef}
                        style={{
                          ...styles.workspacePill,
                          ...(isHoveringWorkspace ? styles.workspacePillHover : {}),
                        }}
                        onClick={handleSelectWorkspace}
                        onMouseEnter={() => setIsHoveringWorkspace(true)}
                        onMouseLeave={() => setIsHoveringWorkspace(false)}
                      >
                        <FolderIcon size={13} />
                        <span style={styles.workspaceText}>{workspaceName}</span>
                      </div>
                    </Tooltip>
                  )}
                </>
              )}
              rightContent={(
                <>
                  <div style={styles.modeSwitcher}>
                    <Tooltip title="高效模式" position="bottom">
                      <button
                        ref={efficientModeBtnRef}
                        style={{
                          ...styles.modeBtn,
                          ...(!isSmartMode ? styles.modeBtnActive : {}),
                        }}
                        onClick={() => setIsSmartMode(false)}
                      >
                        <LightningIcon size={15} />
                      </button>
                    </Tooltip>
                    <Tooltip title="全能模式" position="bottom">
                      <button
                        ref={omnipotentModeBtnRef}
                        style={{
                          ...styles.modeBtn,
                          ...(isSmartMode ? styles.modeBtnActive : {}),
                        }}
                        onClick={() => setIsSmartMode(true)}
                      >
                        <OmnipotentIcon size={15} />
                      </button>
                    </Tooltip>
                  </div>
                  <Tooltip title={input.trim() ? '发送（Enter）' : '请输入内容'} position="top">
                    <button
                      onClick={() => handleSubmit(input)}
                      disabled={!input.trim()}
                      style={{
                        ...styles.sendBtn,
                        ...(input.trim() ? styles.sendBtnActive : styles.sendBtnDisabled),
                      }}
                    >
                      <ArrowUpOutlined style={{ fontSize: 18 }} />
                    </button>
                  </Tooltip>
                </>
              )}
            />
          )}
        />

        {/* Quick chips */}
        <div style={styles.chipsRow}>
          {QUICK_CHIPS.map(chip => {
            const IconComponent = chip.icon
            return (
              <QuickChip
                key={chip.label}
                icon={<IconComponent size={ICON_SIZE} />}
                label={chip.label}
                color={chip.color}
                onClick={() => onStartTask(`帮我${chip.label}`, isSmartMode)}
              />
            )
          })}
        </div>

      </div>
    </div>
  )
}


const styles: Record<string, React.CSSProperties> = {
  page: {
    flex: 1, display: 'flex', flexDirection: 'column',
    background: 'var(--bg-primary)', overflow: 'auto',
    position: 'relative',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 40px',
    maxWidth: 960,
    margin: '0 auto',
    width: '100%',
    minHeight: 'calc(100vh - 100px)',
    position: 'relative',
  },
  // 标题容器（包含标题和点阵，通过层级控制重叠）
  titleContainer: {
    position: 'relative',
    width: '800px',
    height: 86,  // 标题高度 (~20px) + 点阵高度 (66px)
    marginBottom: 6,  // 与输入框的间距
  },
  // 闪烁点背景效果（等腰梯形点阵）
  sparkleBackground: {
    position: 'absolute',
    top: 20,  // 从标题下方开始
    left: 0,
    width: '800px',
    height: 66,      // 实际点阵高度：(12-1) * 6px = 66px
    pointerEvents: 'none',
    zIndex: 0,       // 点阵在下层
    opacity: 0,
    animation: 'sparkle-fade-in 0.5s ease-out forwards',
    animationDelay: '0.2s',
  },
  sparkleDot: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: '50%',
    background: 'rgba(100, 180, 255, 0.8)',  // 淡蓝色
    animation: 'sparkle-home 1.5s ease-in-out infinite',
    pointerEvents: 'none',
  },
  heroTitle: {
    position: 'absolute',  // 绝对定位
    top: 0,                // 与点阵顶部对齐
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1,             // 标题在上层
    fontSize: 36, fontWeight: 600, color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    textAlign: 'center',
    width: '100%',
  },
  modeSwitcher: {
    display: 'flex',
    border: '1px solid var(--border-medium)',
    borderRadius: 10,
    background: 'transparent',
    padding: 0,
    gap: 0,
    position: 'relative',
  },
  modeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    border: 'none',
    borderRadius: 10,
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--icon-tertiary)',
    transition: 'all 0.15s ease',
    padding: 0,
  },
  modeBtnActive: {
    background: 'var(--active-bg)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    borderRadius: 10,
  },
  workspacePill: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '0 10px',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border-medium)',
    background: 'transparent',
    cursor: 'pointer',
    marginLeft: 4,
    height: 36,
    minWidth: 150,
    maxWidth: 240,
    transition: 'all 0.15s ease',
    overflow: 'hidden',
  },
  workspacePillHover: {
    background: 'var(--bg-secondary)',
    borderColor: 'var(--border-dark)',
  },
  workspaceText: { 
    fontSize: 12, 
    color: 'var(--text-secondary)', 
    overflow: 'hidden', 
    textOverflow: 'ellipsis', 
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: 0,
    flexShrink: 0,
  },
  sendBtnActive: {
    background: 'var(--accent-primary)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
  sendBtnDisabled: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-disabled)',
    cursor: 'not-allowed',
  },
  chipsRow: {
    display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
    marginBottom: 40,
  },
}
