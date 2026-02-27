import React, { useState } from 'react'
import type { SidebarWithMenuProps } from '../Sidebar.types'
import { styles } from '../Sidebar.styles'
import { NavActions } from './NavActions'
import { UserMenu } from './UserMenu'
import IconButton from '@ui/IconButton'
import { ExpandIcon, LogoIcon } from '@ui'

interface CollapsedSidebarProps extends SidebarWithMenuProps {}

export function CollapsedSidebar({
  onToggleExpand,
  userMenuOpen,
  onToggleUserMenu,
  onCloseUserMenu,
  userMenuContainerRef,
  ...props
}: CollapsedSidebarProps) {
  const [logoHovered, setLogoHovered] = useState(false)

  return (
    <div style={styles.collapsedSidebar}>
      {/* Top: Logo */}
      <div style={styles.collapsedTop}>
        <IconButton
          variant="borderless"
          style={{
            ...styles.logoBtn,
            width: 36,
            height: 36,
            background: 'transparent',
            border: 'none',
          }}
          icon={logoHovered ? <ExpandIcon size={22} /> : <LogoIcon size={22} />}
          onClick={onToggleExpand}
          title="展开"
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        />
      </div>

      {/* Nav actions */}
      <NavActions onNewTask={props.onNewTask} onSearch={props.onSearch} collapsed />

      {/* Task records - hidden when collapsed */}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom: User Avatar */}
      <div style={styles.collapsedBottom} ref={userMenuContainerRef}>
        <UserMenu
          settings={props.settings}
          onSettings={props.onSettings}
          isOpen={userMenuOpen}
          onOpenChange={onToggleUserMenu}
          collapsed
        />
      </div>
    </div>
  )
}
