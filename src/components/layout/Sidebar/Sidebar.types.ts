import type { Conversation, Settings } from '../../types'

export interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  settings: Settings
  onHome: () => void
  onSelect: (id: string) => void
  onNewTask: () => void
  onDelete: (id: string) => void
  onSettings: () => void
  onSearch: () => void
  onScheduledTasks: () => void
}

export interface SidebarWithMenuProps extends SidebarProps {
  onToggleExpand: () => void
  userMenuOpen: boolean
  onToggleUserMenu: () => void
  onCloseUserMenu: () => void
  userMenuContainerRef: React.RefObject<HTMLDivElement>
}

export interface UserMenuProps {
  settings: Settings
  onSettings: () => void
  onScheduledTasks: () => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  collapsed?: boolean
}

export interface TaskListProps {
  conversations: Conversation[]
  activeId: string | null
  isOpen: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onToggle: () => void
}

export interface NavActionsProps {
  onNewTask: () => void
  onSearch: () => void
  collapsed?: boolean
}

export interface TaskItemProps {
  conversation: Conversation
  isActive: boolean
  isHovered: boolean
  onSelect: () => void
  onDelete: () => void
  onHoverChange: (hovered: boolean) => void
}
