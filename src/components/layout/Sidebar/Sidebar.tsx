import React, { useState, useRef, useEffect } from 'react'
import type { SidebarProps } from './Sidebar.types'
import { CollapsedSidebar } from './components/CollapsedSidebar'
import { ExpandedSidebar } from './components/ExpandedSidebar'

export default function Sidebar(props: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuContainerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuOpen && userMenuContainerRef.current && 
          !userMenuContainerRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

  const handleToggleExpand = () => {
    setCollapsed(p => !p)
  }

  const handleToggleUserMenu = () => {
    setUserMenuOpen(p => !p)
  }

  const handleCloseUserMenu = () => {
    setUserMenuOpen(false)
  }

  if (collapsed) {
    return (
      <CollapsedSidebar
        {...props}
        onToggleExpand={handleToggleExpand}
        userMenuOpen={userMenuOpen}
        onToggleUserMenu={handleToggleUserMenu}
        onCloseUserMenu={handleCloseUserMenu}
        userMenuContainerRef={userMenuContainerRef}
      />
    )
  }

  return (
    <ExpandedSidebar
      {...props}
      onToggleExpand={handleToggleExpand}
      userMenuOpen={userMenuOpen}
      onToggleUserMenu={handleToggleUserMenu}
      onCloseUserMenu={handleCloseUserMenu}
      userMenuContainerRef={userMenuContainerRef}
    />
  )
}
