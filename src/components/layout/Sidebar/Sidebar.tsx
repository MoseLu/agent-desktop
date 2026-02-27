import React, { useState, useRef, useEffect } from 'react'
import type { SidebarProps } from './Sidebar.types'
import { CollapsedSidebar } from './components/CollapsedSidebar'
import { ExpandedSidebar } from './components/ExpandedSidebar'

// 与 Claude Desktop 保持一致的响应式折叠断点
const COLLAPSE_BREAKPOINT = 860

export default function Sidebar(props: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < COLLAPSE_BREAKPOINT
  })
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuContainerRef = useRef<HTMLDivElement>(null)
  // 追踪当前折叠是否由响应式断点自动触发（区分用户手动操作）
  const autoCollapsedRef = useRef(
    typeof window !== 'undefined' && window.innerWidth < COLLAPSE_BREAKPOINT
  )

  // 响应式：窗口变窄自动折叠，窗口变宽且为自动折叠时自动展开
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COLLAPSE_BREAKPOINT - 1}px)`)
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // 进入窄屏：自动折叠
        autoCollapsedRef.current = true
        setCollapsed(true)
      } else if (autoCollapsedRef.current) {
        // 恢复宽屏且之前是自动折叠：自动展开
        autoCollapsedRef.current = false
        setCollapsed(false)
      }
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

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
    // 用户手动操作：清除自动折叠标记，允许宽屏下保持折叠
    autoCollapsedRef.current = false
    setCollapsed(p => !p)
  }

  const handleToggleUserMenu = () => {
    setUserMenuOpen(p => !p)
  }

  const handleCloseUserMenu = () => {
    setUserMenuOpen(false)
  }

  const sharedProps = {
    ...props,
    onToggleExpand: handleToggleExpand,
    userMenuOpen,
    onToggleUserMenu: handleToggleUserMenu,
    onCloseUserMenu: handleCloseUserMenu,
    userMenuContainerRef,
  }

  const wrapperStyle: React.CSSProperties = {
    width: collapsed ? 64 : 240,
    minWidth: collapsed ? 64 : 240,
    flexShrink: 0,
    overflow: 'hidden',
    transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
  }

  return (
    <div style={wrapperStyle}>
      {collapsed
        ? <CollapsedSidebar {...sharedProps} />
        : <ExpandedSidebar {...sharedProps} />
      }
    </div>
  )
}
