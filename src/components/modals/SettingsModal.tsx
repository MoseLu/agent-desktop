import React, { useState, useRef } from 'react'
import type { Settings } from '@types'
import { appConfig } from '@config'
import { CameraOutlined } from '@ant-design/icons'
import { isElectron } from '@utils/env'
import { SunIcon, MoonIcon, DesktopIcon, AlarmCheckIcon } from '@ui/icons'
import Tooltip from '@ui/Tooltip'
import { message } from '@ui/Message'

// 模型列表预留 - 后续从后端 API 获取
const DEFAULT_MODELS: Array<{ id: string; label: string }> = []

type SettingsTab = 'account' | 'general' | 'desktop-general' | 'notifications'

interface Props {
  initial: Settings
  onSave: (s: Partial<Settings>) => Promise<void>
  onClose: () => void
  onScheduledTasks?: () => void
}

export default function SettingsModal({ initial, onSave, onClose, onScheduledTasks }: Props) {
  const [form, setForm] = useState({ ...initial })
  const [showKey, setShowKey] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false)
  const [shortcutInput, setShortcutInput] = useState(form.shortcut || 'Alt+A')

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    // 所有设置变化时立即保存并通知父组件
    if (isElectron()) {
      window.electron.saveSettings({ [k]: v })
    } else {
      console.log('[Browser Mode] Settings updated:', k, v)
    }
    onSave({ [k]: v })
  }

  const pickFolder = async () => {
    if (!isElectron()) {
      message.warning('请在 Electron 环境中使用此功能', 3000)
      return
    }
    const folder = await window.electron.pickFolder()
    if (folder) {
      set('workspace', folder)
      message.success('工作目录已更新', 2000)
    }
  }

  const handleAvatarUpload = async () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    // 检查文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('头像大小不能超过 5MB')
      return
    }

    // 读取文件并转换为 base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      set('userAvatar', base64)
    }
    reader.readAsDataURL(file)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div style={styles.tabContent}>
            <div style={styles.sectionTitle}>账号</div>
            <div style={styles.sectionDesc}>{appConfig.settingsDescriptions.account}</div>
            
            <Field label="头像">
              <Tooltip title="点击上传头像" position="right">
                <div
                  style={styles.avatarPreview}
                  onClick={handleAvatarUpload}
                  onMouseEnter={() => setIsHoveringAvatar(true)}
                  onMouseLeave={() => setIsHoveringAvatar(false)}
                >
                  {form.userAvatar ? (
                    <img src={form.userAvatar} alt="头像" style={styles.avatarImage} />
                  ) : (
                    <span style={styles.avatarPlaceholder}>{form.userName.charAt(0)}</span>
                  )}
                  {/* 悬浮蒙层和编辑图标 */}
                  {isHoveringAvatar && (
                    <div style={styles.avatarOverlay}>
                      <CameraOutlined style={{ fontSize: 28, color: 'white' }} />
                  </div>
                )}
              </div>
              </Tooltip>
            </Field>

            <Field label="用户名" required>
              <input
                type="text"
                style={styles.input}
                value={form.userName}
                onChange={e => set('userName', e.target.value)}
                placeholder="请输入用户名"
              />
            </Field>

            <Field label="UID">
              <div style={styles.uidDisplay}>
                <span style={styles.uidText}>483229324081983496</span>
                <button style={styles.copyBtn}>复制</button>
              </div>
            </Field>
          </div>
        )

      case 'general':
        return (
          <div style={styles.tabContent}>
            <Field label="外观">
              <div style={styles.themeCards}>
                {/* 浅色模式 - 太阳（暖色调） */}
                <div
                  style={{
                    ...styles.themeCard,
                    ...(form.theme === 'light' ? styles.themeCardSelected : {}),
                  }}
                  onClick={() => set('theme', 'light')}
                >
                  <div style={{ ...styles.themeCardIcon, color: '#ffa940' }}>
                    <SunIcon size={28} />
                  </div>
                  <div style={styles.themeCardLabel}>浅色</div>
                </div>
                
                {/* 深色模式 - 月亮（蓝白色调） */}
                <div
                  style={{
                    ...styles.themeCard,
                    ...(form.theme === 'dark' ? styles.themeCardSelected : {}),
                  }}
                  onClick={() => set('theme', 'dark')}
                >
                  <div style={{ ...styles.themeCardIcon, color: '#40a9ff' }}>
                    <MoonIcon size={28} />
                  </div>
                  <div style={styles.themeCardLabel}>黑暗</div>
                </div>
                
                {/* 系统模式 */}
                <div
                  style={{
                    ...styles.themeCard,
                    ...(form.theme === 'system' ? styles.themeCardSelected : {}),
                  }}
                  onClick={() => set('theme', 'system')}
                >
                  <div style={{ ...styles.themeCardIcon, color: '#667eea' }}>
                    <DesktopIcon size={28} />
                  </div>
                  <div style={styles.themeCardLabel}>系统</div>
                </div>
              </div>
            </Field>
          </div>
        )

      case 'desktop-general':
        return (
          <div style={{ ...styles.tabContent, maxWidth: '100%' }}>
            {/* 菜单栏 */}
            <DesktopRow
              label="菜单栏"
              desc={`在菜单栏中显示 ${appConfig.appName}`}
              control={
                <label className="switch">
                  <input type="checkbox" checked={form.showInMenuBar ?? true} onChange={e => set('showInMenuBar', e.target.checked)} />
                  <span className="slider"></span>
                </label>
              }
            />

            {/* 开机自动 */}
            <DesktopRow
              label="开机自动"
              desc={`登录计算机时自动启动 ${appConfig.appName}`}
              control={
                <label className="switch">
                  <input type="checkbox" checked={form.autoStart ?? false} onChange={e => set('autoStart', e.target.checked)} />
                  <span className="slider"></span>
                </label>
              }
            />

            {/* 快捷键唤起小窗 */}
            <DesktopRow
              label="快捷键唤起小窗"
              desc="在桌面任意位置唤醒 MiniMax Agent"
              control={
                <div style={styles.shortcutWrapper}>
                  <input
                    type="text"
                    style={styles.shortcutFieldInline}
                    value={shortcutInput}
                    readOnly
                    onKeyDown={e => {
                      e.preventDefault()
                      const keys: string[] = []
                      if (e.ctrlKey) keys.push('Ctrl')
                      if (e.altKey) keys.push('Alt')
                      if (e.shiftKey) keys.push('Shift')
                      if (e.metaKey) keys.push('Win')
                      const key = e.key
                      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
                        keys.push(key)
                      }
                      const shortcut = keys.join('+')
                      setShortcutInput(shortcut)
                      set('shortcut', shortcut)
                    }}
                    placeholder="输入快捷键"
                  />
                  {shortcutInput && (
                    <button style={styles.clearBtnInline} onClick={() => {
                      setShortcutInput('')
                      set('shortcut', '')
                    }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              }
            />

            {/* 工作区路径 */}
            <DesktopRow
              label="工作区路径"
              desc={form.workspace || '未设置'}
              control={
                <button style={styles.editBtn} onClick={pickFolder}>更改</button>
              }
            />

            {/* 命令白名单 */}
            <DesktopRow
              label="命令白名单"
              desc="允许自动运行的命令"
              control={<button style={styles.editBtn}>编辑</button>}
            />

            {/* 文件夹访问权限 */}
            <DesktopRow
              label="文件夹访问权限"
              desc="已授予读写权限的文件夹"
              control={<button style={styles.editBtn}>编辑</button>}
            />

            {/* 语言 */}
            <DesktopRow
              label="语言"
              control={
                <select style={styles.selectInline} value={form.language || 'zh-CN'} onChange={e => set('language', e.target.value)}>
                  <option value="zh-CN">中文</option>
                  <option value="en">English</option>
                </select>
              }
              last
            />
          </div>
        )

      case 'notifications':
        return (
          <div style={{ ...styles.tabContent, maxWidth: '100%' }}>
            {/* Permission card */}
            <div style={styles.notifyCard}>
              <div style={styles.notifyCardLeft}>
                <div style={styles.notifyCardIcon}>
                  <BellIcon />
                </div>
                <div>
                  <div style={styles.notifyCardTitle}>通知权限</div>
                  <div style={styles.notifyCardDesc}>
                    {form.desktopNotifications
                      ? '已允许应用发送桌面通知'
                      : '通知已关闭，开启后可接收任务提醒'}
                  </div>
                </div>
              </div>
              <button
                style={styles.manageBtn}
                onClick={() => {
                  if (isElectron()) {
                    window.electron.openExternal('ms-settings:notifications')
                  }
                }}
              >
                管理
              </button>
            </div>

            {/* Notification rows */}
            <DesktopRow
              label="桌面通知"
              desc="允许应用发送系统通知"
              control={
                <label className="switch">
                  <input type="checkbox" checked={form.desktopNotifications ?? true} onChange={e => set('desktopNotifications', e.target.checked)} />
                  <span className="slider"></span>
                </label>
              }
            />

            <DesktopRow
              label="任务完成提醒"
              desc="任务完成或出错时显示通知"
              control={
                <label className="switch">
                  <input type="checkbox" checked={form.taskCompleteNotify ?? true} onChange={e => set('taskCompleteNotify', e.target.checked)} />
                  <span className="slider"></span>
                </label>
              }
            />

            <DesktopRow
              label="声音提醒"
              desc="收到通知时播放提示音"
              control={
                <label className="switch">
                  <input type="checkbox" checked={form.soundNotify ?? false} onChange={e => set('soundNotify', e.target.checked)} />
                  <span className="slider"></span>
                </label>
              }
              last
            />
          </div>
        )

      default:
        return null
    }
  }

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'general': return '通用'
      case 'account': return '账号'
      case 'desktop-general': return '通用'
      case 'notifications': return '通知'
      default: return ''
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <style>{`
        :root {
          --selection-bg: #0094fc;
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--border-medium);
          transition: 0.3s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        .switch input:checked + .slider {
          background-color: var(--selection-bg);
        }
        .switch input:checked + .slider:before {
          transform: translateX(20px);
        }
      `}</style>
      <div style={styles.modal}>
        {/* Left sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>{appConfig.settingsTitle}</span>
          </div>
          <div style={styles.sidebarMenu}>
            <div style={styles.sidebarSection}>
              <div style={styles.sidebarSectionTitle}>常规设置</div>
              <NavItem active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<SettingsIcon />}>通用</NavItem>
              <NavItem active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={<UserIcon />}>账号</NavItem>
              <NavItem active={false} onClick={() => { onClose(); onScheduledTasks?.() }} icon={<AlarmCheckIcon />}>定时任务</NavItem>
            </div>

            <div style={styles.sidebarSection}>
              <div style={styles.sidebarSectionTitle}>桌面设置</div>
              <NavItem active={activeTab === 'desktop-general'} onClick={() => setActiveTab('desktop-general')} icon={<DesktopIcon />}>通用</NavItem>
              <NavItem active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<BellIcon />}>通知</NavItem>
            </div>
          </div>
        </div>

        {/* Right content */}
        <div style={styles.mainContent}>
          <div style={styles.contentHeader}>
            <span style={styles.contentTitle}>{getActiveTabTitle()}</span>
            <button style={styles.closeBtn} onClick={onClose}>×</button>
          </div>
          <div style={styles.contentBody}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

function NavItem({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        ...styles.navItem,
        ...(active ? styles.navItemActive : {}),
      }}
      onClick={onClick}
    >
      {icon}
      <span style={styles.navItemText}>{children}</span>
    </div>
  )
}

function DesktopRow({ label, desc, control, last }: { label: string; desc?: string; control: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 0',
      borderBottom: last ? 'none' : '1px solid var(--border-light)',
    }}>
      <div style={{ flex: 1, marginRight: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: desc ? 3 : 0 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  )
}

function Field({ label, hint, extra, children, required }: { label: string; hint?: string; extra?: React.ReactNode; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={styles.fieldLabel}>
          {label}
          {required && <span style={{ color: 'var(--error-strong)', marginLeft: 4 }}>*</span>}
        </label>
        {extra}
      </div>
      {children}
      {hint && <span style={styles.fieldHint}>{hint}</span>}
    </div>
  )
}

// Icons
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 15c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.3 3.3l1.4 1.4M13.3 13.3l1.4 1.4M3.3 14.7l1.4-1.4M13.3 4.7l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function BillingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <line x1="2" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13" cy="11" r="1.5" fill="currentColor" />
    </svg>
  )
}

function PointsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 5v5l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 5v4l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2a4 4 0 00-4 4v3.5c0 .8-.3 1.6-.9 2.2L3 13h12l-1.1-1.3c-.6-.6-.9-1.4-.9-2.2V6a4 4 0 00-4-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 15a2 2 0 004 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'var(--modal-backdrop)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(2px)',
  },
  modal: {
    width: 900, height: 600, background: 'var(--modal-bg)', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--modal-shadow)',
    overflow: 'hidden', display: 'flex',
  },
  sidebar: {
    width: 240, background: 'var(--bg-secondary)',
    display: 'flex', flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '20px 24px',
  },
  sidebarTitle: {
    fontSize: 14, fontWeight: 400, color: 'var(--text-primary)',
  },
  sidebarMenu: {
    flex: 1, padding: '16px 12px', overflowY: 'auto',
  },
  sidebarSection: {
    marginBottom: 24,
  },
  sidebarSectionTitle: {
    fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
    padding: '0 12px', marginBottom: 8, letterSpacing: '0.03em',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8,
    cursor: 'pointer', fontSize: 13.5, color: 'var(--text-secondary)',
    transition: 'all 0.15s', marginBottom: 2,
  },
  navItemActive: {
    background: '#0094fc', boxShadow: 'var(--shadow-sm)',
    color: 'white', fontWeight: 500,
  },
  navItemText: {
    flex: 1,
  },
  mainContent: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  contentHeader: {
    padding: '20px 28px', borderBottom: '1px solid var(--border-light)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  contentTitle: {
    fontSize: 20, fontWeight: 600, color: 'var(--text-primary)',
  },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 28, lineHeight: 1, padding: '4px 8px' },
  contentBody: {
    flex: 1, padding: '24px 28px', overflowY: 'auto',
  },
  tabContent: {
    maxWidth: 600,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, // 提高描述文字对比度
  },
  fieldLabel: {
    fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em', // 提高标签对比度
  },
  fieldHint: {
    fontSize: 11, color: 'var(--text-secondary)', // 提高提示文字对比度
  },
  input: {
    width: '100%', border: '1px solid var(--border-medium)', borderRadius: 8,
    padding: '10px 12px', fontSize: 13.5, color: 'var(--text-primary)', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
    boxSizing: 'border-box', background: 'var(--bg-primary)',
  },
  inputGroup: { display: 'flex', gap: 6 },
  select: {
    width: '100%', border: '1px solid var(--border-medium)', borderRadius: 8,
    padding: '10px 12px', fontSize: 13.5, color: 'var(--text-primary)', outline: 'none',
    background: 'var(--bg-primary)', fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  toggleBtn: {
    border: '1px solid var(--border-medium)', background: 'var(--bg-secondary)', borderRadius: 8,
    padding: '0 16px', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-secondary)', fontFamily: 'inherit',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  },
  range: { width: '100%', accentColor: 'var(--accent-primary)' },
  rangeLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 },
  link: { fontSize: 11.5, color: 'var(--info)', textDecoration: 'none', fontWeight: 500 },
  warning: {
    padding: '12px 16px', background: 'var(--warning)', border: '1px solid var(--border-medium)',
    borderRadius: 8, fontSize: 12.5, color: 'var(--text-primary)', marginTop: 8, opacity: 0.9,
  },
  uidDisplay: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8,
    border: '1px solid var(--border-medium)',
  },
  uidText: {
    fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace',
  },
  copyBtn: {
    background: 'none', border: 'none', color: 'var(--info)',
    cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
  },
  planDisplay: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8,
    border: '1px solid var(--border-medium)',
  },
  planName: {
    fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)',
  },
  upgradeBtn: {
    background: 'var(--text-primary)', border: 'none', borderRadius: 16,
    padding: '4px 12px', color: 'var(--bg-primary)', fontSize: 12, fontWeight: 500,
    cursor: 'pointer',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s',
    zIndex: 1,
  },
  avatarOverlayIcon: {
    opacity: 1,
    filter: 'brightness(0) invert(1)',
  },
  pointsCard: {
    background: 'var(--accent-gradient)',
    borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', color: 'var(--text-inverse)',
    textAlign: 'center', marginBottom: 'var(--space-5)',
  },
  pointsAmount: {
    fontSize: 42, fontWeight: 700, marginBottom: 4,
  },
  pointsLabel: {
    fontSize: 13.5, opacity: 0.9,
  },
  pointsActions: {
    display: 'flex', gap: 10,
  },
  pointsBtn: {
    flex: 1, border: '1px solid var(--border-medium)', background: 'var(--bg-primary)',
    borderRadius: 8, padding: '10px', fontSize: 13.5, color: 'var(--text-secondary)',
    cursor: 'pointer', fontWeight: 500,
  },
  pointsBtnPrimary: {
    flex: 1, border: 'none', background: 'var(--text-primary)',
    borderRadius: 8, padding: '10px', fontSize: 13.5, color: 'var(--bg-primary)',
    cursor: 'pointer', fontWeight: 500,
  },
  emptyState: {
    textAlign: 'center', padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: 48, marginBottom: 12, opacity: 0.5,
  },
  emptyText: {
    fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20,
  },
  addTaskBtn: {
    background: 'var(--text-primary)', border: 'none', borderRadius: 8,
    padding: '10px 24px', color: 'var(--bg-primary)', fontSize: 13.5,
    fontWeight: 500, cursor: 'pointer',
  },
  checkbox: {
    display: 'flex', alignItems: 'center', gap: 10,
    cursor: 'pointer', fontSize: 13.5, color: 'var(--text-primary)',
  },
  themeCards: {
    display: 'flex', gap: 12, marginBottom: 16,
  },
  themeCard: {
    flex: 1,
    border: '2px solid var(--border-dark)',
    borderRadius: 12,
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'var(--bg-secondary)',
  },
  themeCardSelected: {
    border: '2px solid #0094fc',
    background: 'var(--bg-primary)',
    boxShadow: '0 0 0 3px rgba(0, 148, 252, 0.2)', // 添加蓝色外发光
  },
  themeCardIcon: {
    fontSize: 28,
  },
  themeCardLabel: {
    fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
  },
  divider: {
    height: 1, background: 'var(--border-medium)', margin: '24px 0',
  },
  shortcutWrapper: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  shortcutField: {
    flex: 1,
    border: '1px solid var(--border-medium)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13.5,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: 'var(--bg-primary)',
  },
  clearBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    borderRadius: 6,
    transition: 'all 0.15s',
  },
  editBtn: {
    border: '1px solid var(--border-medium)',
    background: 'var(--bg-primary)',
    borderRadius: 8,
    padding: '6px 16px',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  shortcutFieldInline: {
    width: 100,
    border: '1px solid var(--border-medium)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    background: 'var(--bg-primary)',
    textAlign: 'center' as const,
  },
  clearBtnInline: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24,
    border: 'none',
    background: 'var(--bg-secondary)',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    borderRadius: '50%',
    flexShrink: 0,
  },
  selectInline: {
    border: '1px solid var(--border-medium)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    background: 'var(--bg-primary)',
    fontFamily: 'inherit',
    minWidth: 90,
  },
  horizontalField: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%',
  },
  fieldDesc: {
    fontSize: 13.5, color: 'var(--text-secondary)',
  },
  notifyCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', marginBottom: 20,
    background: 'var(--bg-secondary)', border: '1px solid var(--border-light)',
    borderRadius: 12,
  },
  notifyCardLeft: {
    display: 'flex', alignItems: 'center', gap: 14,
  },
  notifyCardIcon: {
    width: 40, height: 40, borderRadius: 10,
    background: 'var(--bg-primary)', border: '1px solid var(--border-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-secondary)', flexShrink: 0,
  },
  notifyCardTitle: {
    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2,
  },
  notifyCardDesc: {
    fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.4,
  },
  manageBtn: {
    border: '1px solid var(--border-medium)', background: 'var(--bg-primary)',
    borderRadius: 8, padding: '6px 16px', fontSize: 13,
    color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
    flexShrink: 0,
  },
  migrateBtn: {
    border: 'none',
    background: 'var(--accent-primary)',
    borderRadius: 8,
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: 14,
    color: 'white',
    fontWeight: 600,
    marginTop: 16,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    fontSize: 32,
    fontWeight: 600,
    color: 'white',
  },
}
