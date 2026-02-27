import React from 'react'
import type { NavActionsProps } from '../Sidebar.types'
import { styles } from '../Sidebar.styles'
import IconButton from '@ui/IconButton'
import { PlusIcon, SearchIcon } from '@ui'

export function NavActions({ onNewTask, onSearch, collapsed = false }: NavActionsProps) {
  if (collapsed) {
    return (
      <div style={styles.collapsedNavSection}>
        <IconButton
          variant="borderless"
          style={styles.collapsedNavBtn}
          icon={<PlusIcon size={18} />}
          onClick={onNewTask}
          title="新建任务"
        />
        <IconButton
          variant="borderless"
          style={styles.collapsedNavBtn}
          icon={<SearchIcon size={18} />}
          onClick={onSearch}
          title="搜索"
        />
      </div>
    )
  }

  return (
    <div style={styles.navSection}>
      <button style={styles.navBtn} onClick={onNewTask}>
        <PlusIcon size={18} />
        <span>新建任务</span>
      </button>
      <button style={styles.navBtn} onClick={onSearch}>
        <SearchIcon size={18} />
        <span>搜索</span>
      </button>
    </div>
  )
}
