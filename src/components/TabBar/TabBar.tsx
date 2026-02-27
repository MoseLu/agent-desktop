import React from 'react'
import type { TabBarProps, TabItemProps } from './TabBar.types'
import { styles } from './TabBar.styles'
import Tooltip from '@ui/Tooltip'

function TabItem({ tab, isActive, isHovered, onSelect, onClose, onHoverChange }: TabItemProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  const handleMouseEnter = () => {
    onHoverChange(true)
  }

  const handleMouseLeave = () => {
    onHoverChange(false)
  }

  const tabItem = (
    <button
      style={{
        ...styles.tabItem,
        ...(isActive ? styles.tabItemActive : {}),
        ...(isHovered ? styles.tabItemHover : {}),
        ...(tab.isDefault ? styles.defaultTab : {}),
      }}
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span style={styles.tabTitle}>{tab.title}</span>
      {!tab.isDefault && (
        <span
          style={{
            ...styles.closeBtn,
            ...(isHovered ? styles.closeBtnVisible : {}),
            ...(isHovered ? styles.closeBtnHover : {}),
          }}
          onClick={handleClose}
        >
          ×
        </span>
      )}
    </button>
  )

  return (
    <Tooltip title={tab.title} position="bottom">
      {tabItem}
    </Tooltip>
  )
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose, onNewTab }: TabBarProps) {
  const [hoveredTabId, setHoveredTabId] = React.useState<string | null>(null)
  const [newBtnHovered, setNewBtnHovered] = React.useState(false)

  return (
    <div style={styles.tabBar} data-tabbar="true">
      {tabs.map(tab => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          isHovered={hoveredTabId === tab.id}
          onSelect={() => onSelect(tab.id)}
          onClose={() => onClose(tab.id)}
          onHoverChange={hovered => setHoveredTabId(hovered ? tab.id : null)}
        />
      ))}
      
      {/* 新建标签按钮 */}
      <Tooltip title="新建标签页" position="bottom">
        <button
          style={{
            ...styles.newTabBtn,
            ...(newBtnHovered ? styles.newTabBtnHover : {}),
          }}
          onClick={onNewTab}
          onMouseEnter={() => setNewBtnHovered(true)}
          onMouseLeave={() => setNewBtnHovered(false)}
        >
          +
        </button>
      </Tooltip>
    </div>
  )
}
