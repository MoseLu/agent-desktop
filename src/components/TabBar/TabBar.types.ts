/**
 * TabBar 组件类型定义
 */

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
  onNewTab?: () => void  // 新建标签回调
}

export interface TabItemProps {
  tab: Tab
  isActive: boolean
  isHovered: boolean
  onSelect: () => void
  onClose: () => void
  onHoverChange: (hovered: boolean) => void
}
