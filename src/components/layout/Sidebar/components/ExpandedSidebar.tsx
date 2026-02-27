import React, { useState } from 'react'
import type { SidebarWithMenuProps } from '../Sidebar.types'
import { styles } from '../Sidebar.styles'
import { NavActions } from './NavActions'
import { TaskList } from './TaskList'
import { UserMenu } from './UserMenu'
import IconButton from '@ui/IconButton'
import { LogoIcon, CollapseIcon } from '@ui'

interface ExpandedSidebarProps extends SidebarWithMenuProps {}

export function ExpandedSidebar({
  onToggleExpand,
  userMenuOpen,
  onToggleUserMenu,
  onCloseUserMenu,
  userMenuContainerRef,
  ...props
}: ExpandedSidebarProps) {
  const [taskRecordOpen, setTaskRecordOpen] = useState(true)

  return (
    <div style={styles.sidebar}>
      {/* Top: Logo + collapse */}
      <div style={styles.topRow}>
        <IconButton
          variant="borderless"
          style={{ ...styles.logoBtn, width: 32, height: 32, background: 'transparent', border: 'none' }}
          icon={<LogoIcon size={22} />}
          onClick={props.onHome}
        />
        <IconButton
          variant="borderless"
          style={styles.collapseBtn}
          icon={<CollapseIcon size={22} />}
          onClick={onToggleExpand}
          title="折叠"
        />
      </div>

      {/* Nav actions */}
      <NavActions onNewTask={props.onNewTask} onSearch={props.onSearch} />

      {/* Task records */}
      <TaskList
        conversations={props.conversations}
        activeId={props.activeId}
        isOpen={taskRecordOpen}
        onSelect={props.onSelect}
        onDelete={props.onDelete}
        onToggle={() => setTaskRecordOpen(p => !p)}
      />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User profile */}
      <div style={styles.userSection} ref={userMenuContainerRef}>
        <UserMenu
          settings={props.settings}
          onSettings={props.onSettings}
          isOpen={userMenuOpen}
          onOpenChange={onToggleUserMenu}
        />
      </div>
    </div>
  )
}
