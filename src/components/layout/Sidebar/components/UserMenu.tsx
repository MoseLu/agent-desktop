import React from 'react'
import type { UserMenuProps } from '../Sidebar.types'
import { styles } from '../Sidebar.styles'
import { Avatar } from '@ui/Avatar'
import Tooltip from '@ui/Tooltip'
import {
  SettingsIcon,
  ContactIcon,
  InfoIcon,
  LogoutIcon,
  ChevronIcon,
  AlarmCheckIcon,
} from '@ui'

export function UserMenu({ settings, onSettings, onScheduledTasks, isOpen, onOpenChange, collapsed = false }: UserMenuProps) {
  const displayName = settings.userName || '开发者'
  const displayPlan = settings.userPlan || '免费'
  
  // 展开状态下显示头像 + 用户名
  if (!collapsed) {
    return (
      <div style={styles.userRowWrapper}>
        <div
          style={styles.userRow}
          onClick={() => onOpenChange(!isOpen)}
        >
          <Avatar
            src={settings.userAvatar}
            name={displayName}
            size="md"
            style={{
              cursor: 'pointer',
            }}
          />
          <span style={styles.userRowName}>{displayName}</span>
        </div>
        
        {/* Dropdown menu */}
        {isOpen && (
          <div style={styles.userMenu}>
            <div style={styles.menuHeader}>
              <span style={{ fontWeight: 500 }}>个人</span>
              <button style={styles.upgradeBtn}>升级</button>
            </div>
            
            <div style={styles.menuItem} onClick={() => { onOpenChange(false); onScheduledTasks(); }}>
              <AlarmCheckIcon size={16} />
              <span>定时任务</span>
            </div>

            <div style={styles.menuItem} onClick={() => { onOpenChange(false); onSettings(); }}>
              <SettingsIcon size={16} />
              <span>设置</span>
            </div>

            <div style={styles.menuItem}>
              <ContactIcon size={16} />
              <span>联系我们</span>
              <ChevronIcon 
                rotated={false} 
                size={10}
                style={{ 
                  transform: 'rotate(-90deg)', 
                  marginLeft: 'auto',
                  width: 10, 
                  height: 10 
                }} 
              />
            </div>
            
            <div style={styles.menuItem}>
              <InfoIcon size={16} />
              <span>了解更多</span>
              <ChevronIcon 
                rotated={false} 
                size={10}
                style={{ 
                  transform: 'rotate(-90deg)', 
                  marginLeft: 'auto',
                  width: 10, 
                  height: 10 
                }} 
              />
            </div>
            
            <div style={styles.menuDivider} />
            
            <div style={styles.menuItem} onClick={() => onOpenChange(false)}>
              <LogoutIcon size={16} />
              <span style={{ color: 'var(--error)' }}>退出登录</span>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  // 折叠状态下只显示头像
  return (
    <div style={styles.userAvatarCollapsedWrapper}>
      <Tooltip title={`${displayName} - ${displayPlan}`} position="right">
        <div
          style={styles.userAvatarCollapsed}
          onClick={() => onOpenChange(!isOpen)}
        >
          <Avatar
            src={settings.userAvatar}
            name={displayName}
            size="sm"
            collapsed
            style={{
              cursor: 'pointer',
            }}
          />
        </div>
      </Tooltip>
      
      {/* Dropdown menu (collapsed) */}
      {isOpen && (
        <div style={styles.userMenuCollapsed}>
          <div style={styles.menuHeader}>
            <span style={{ fontWeight: 500 }}>个人</span>
            <button style={styles.upgradeBtn}>升级</button>
          </div>
          
          <div style={styles.menuItem} onClick={() => { onOpenChange(false); onScheduledTasks(); }}>
            <AlarmCheckIcon />
            <span>定时任务</span>
          </div>

          <div style={styles.menuItem} onClick={() => { onOpenChange(false); onSettings(); }}>
            <SettingsIcon />
            <span>设置</span>
          </div>

          <div style={styles.menuItem}>
            <ContactIcon />
            <span>联系我们</span>
            <ChevronIcon 
              rotated={false}
              style={{ 
                transform: 'rotate(-90deg)', 
                marginLeft: 'auto',
                width: 10, 
                height: 10 
              }} 
            />
          </div>
          
          <div style={styles.menuItem}>
            <InfoIcon />
            <span>了解更多</span>
            <ChevronIcon 
              rotated={false}
              style={{ 
                transform: 'rotate(-90deg)', 
                marginLeft: 'auto',
                width: 10, 
                height: 10 
              }} 
            />
          </div>
          
          <div style={styles.menuDivider} />
          
          <div style={styles.menuItem} onClick={() => onOpenChange(false)}>
            <LogoutIcon />
            <span style={{ color: 'var(--error)' }}>退出登录</span>
          </div>
        </div>
      )}
    </div>
  )
}
