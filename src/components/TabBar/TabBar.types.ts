/**
 * TabBar 组件类型定义
 */
import type { AppMode } from '@types'

export interface Tab {
  id: string
  title: string
  conversationId?: string  // 关联的对话 ID，默认标签为 undefined
  isDefault: boolean  // 是否为默认标签
}

export interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onSelect: (tabId: string) => void
  onClose: (tabId: string) => void
  onNewTab?: () => void
  /** 当前应用模式 */
  mode: AppMode
  /** 切换模式回调（仅真实 Electron 可切到 code） */
  onModeChange: (mode: AppMode) => void
  /** 是否为真实 Electron 环境（决定 Code 按钮是否可用） */
  isRealElectron: boolean
}

export interface TabItemProps {
  tab: Tab
  isActive: boolean
  isHovered: boolean
  onSelect: () => void
  onClose: () => void
  onHoverChange: (hovered: boolean) => void
}
