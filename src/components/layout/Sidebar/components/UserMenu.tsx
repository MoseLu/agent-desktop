import React from 'react'
import type { UserMenuProps } from '../Sidebar.types'
import { styles } from '../Sidebar.styles'
import { Avatar } from '@ui/Avatar'
import Tooltip from '@ui/Tooltip'
import {
  SettingOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  RightOutlined,
} from '@ant-design/icons'

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
            <div style={styles.menuItem} onClick={() => { onOpenChange(false); onScheduledTasks(); }}>
              <ClockCircleOutlined style={{ fontSize: 16 }} />
              <span>定时任务</span>
            </div>

            <div style={styles.menuItem} onClick={() => { onOpenChange(false); onSettings(); }}>
              <SettingOutlined style={{ fontSize: 16 }} />
              <span>设置</span>
            </div>

            <div style={styles.menuItem}>
              <CustomerServiceOutlined style={{ fontSize: 16 }} />
              <span>联系我们</span>
              <RightOutlined 
                style={{ 
                  fontSize: 10,
                  marginLeft: 'auto',
                }} 
              />
            </div>
            
            <div style={styles.menuItem}>
              <InfoCircleOutlined style={{ fontSize: 16 }} />
              <span>了解更多</span>
              <RightOutlined 
                style={{ 
                  fontSize: 10,
                  marginLeft: 'auto',
                }} 
              />
            </div>
            
            <div style={styles.menuDivider} />
            
            <div style={styles.menuItem} onClick={() => onOpenChange(false)}>
              <LogoutOutlined style={{ fontSize: 16 }} />
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
          <div style={styles.menuItem} onClick={() => { onOpenChange(false); onScheduledTasks(); }}>
            <ClockCircleOutlined />
            <span>定时任务</span>
          </div>

          <div style={styles.menuItem} onClick={() => { onOpenChange(false); onSettings(); }}>
            <SettingOutlined />
            <span>设置</span>
          </div>

          <div style={styles.menuItem}>
            <CustomerServiceOutlined />
            <span>联系我们</span>
            <RightOutlined 
              style={{ 
                fontSize: 10,
                marginLeft: 'auto',
              }} 
            />
          </div>
          
          <div style={styles.menuItem}>
            <InfoCircleOutlined />
            <span>了解更多</span>
            <RightOutlined 
              style={{ 
                fontSize: 10,
                marginLeft: 'auto',
              }} 
            />
          </div>
          
          <div style={styles.menuDivider} />
          
          <div style={styles.menuItem} onClick={() => onOpenChange(false)}>
            <LogoutOutlined />
            <span style={{ color: 'var(--error)' }}>退出登录</span>
          </div>
        </div>
      )}
    </div>
  )
}
