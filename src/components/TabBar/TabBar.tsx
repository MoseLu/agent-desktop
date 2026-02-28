import React from 'react'
import type { AppMode } from '@types'
import type { TabBarProps, TabItemProps } from './TabBar.types'
import { styles } from './TabBar.styles'
import Tooltip from '@ui/Tooltip'

function TabItem({ tab, isActive, isHovered, onSelect, onClose, onHoverChange }: TabItemProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  return (
    <Tooltip title={tab.title} position="bottom">
      <button
        style={{
          ...styles.tabItem,
          ...(isActive ? styles.tabItemActive : {}),
          ...(isHovered ? styles.tabItemHover : {}),
          ...(tab.isDefault ? styles.defaultTab : {}),
        }}
        onClick={onSelect}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
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
    </Tooltip>
  )
}

function ModeSwitcher({
  mode,
  onModeChange,
  isRealElectron,
}: {
  mode: AppMode
  onModeChange: (m: AppMode) => void
  isRealElectron: boolean
}) {
  const codeDisabled = !isRealElectron

  return (
    <div style={styles.modeSwitcherWrap}>
      <div style={styles.modeSwitcher}>
        <button
          style={{
            ...styles.modeBtn,
            ...(mode === 'chat' ? styles.modeBtnActive : {}),
          }}
          onClick={() => onModeChange('chat')}
        >
          Chat
        </button>

        <Tooltip
          title={codeDisabled ? 'Code 模式仅在桌面版（Electron）中可用' : ''}
          position="bottom"
        >
          <button
            style={{
              ...styles.modeBtn,
              ...(mode === 'code' ? styles.modeBtnActive : {}),
              ...(codeDisabled ? styles.modeBtnDisabled : {}),
            }}
            onClick={() => { if (!codeDisabled) onModeChange('code') }}
          >
            Code
          </button>
        </Tooltip>
      </div>
    </div>
  )
}

export default function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onNewTab,
  mode,
  onModeChange,
  isRealElectron,
}: TabBarProps) {
  const [hoveredTabId, setHoveredTabId] = React.useState<string | null>(null)
  const [newBtnHovered, setNewBtnHovered] = React.useState(false)

  return (
    <div style={styles.tabBar} data-tabbar="true">
      {/* 标签列表 */}
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

      {/* 右侧：Chat / Code 模式切换器 */}
      <ModeSwitcher
        mode={mode}
        onModeChange={onModeChange}
        isRealElectron={isRealElectron}
      />
    </div>
  )
}
