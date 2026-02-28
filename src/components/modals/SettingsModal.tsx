import React, { useState, useRef, useEffect } from 'react'
import type { Settings, FolderPermission } from '@types'
import { appConfig } from '@config'
import { CameraOutlined } from '@ant-design/icons'
import { isElectron } from '@utils/env'
import { SunIcon, MoonIcon, DesktopIcon, AlarmCheckIcon } from '@ui/icons'
import Tooltip from '@ui/Tooltip'
import { message } from '@ui/Message'

// 模型列表预留 - 后续从后端 API 获取
const DEFAULT_MODELS: Array<{ id: string; label: string }> = []

type SettingsTab = 'account' | 'general' | 'desktop-general' | 'notifications' | 'scheduled-tasks'

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
  const [showCommandWhitelist, setShowCommandWhitelist] = useState(false)
  const [showFolderPermissions, setShowFolderPermissions] = useState(false)
  const [accountDraft, setAccountDraft] = useState({
    userName: initial.userName ?? '',
    userAvatar: initial.userAvatar ?? '',
  })

  // 防抖磁盘写入：积累所有待保存字段，500ms 后批量写入
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<Partial<Settings>>({})

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    onSave({ [k]: v })  // 立即更新父组件 React 状态（廉价操作）

    // 积累变更，防抖写盘
    pendingRef.current = { ...pendingRef.current, [k]: v }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const toSave = pendingRef.current
      pendingRef.current = {}
      if (isElectron()) {
        window.electron.saveSettings(toSave)
      } else {
        try {
          const stored = localStorage.getItem('app-settings')
          const existing = stored ? JSON.parse(stored) : {}
          localStorage.setItem('app-settings', JSON.stringify({ ...existing, ...toSave }))
        } catch (err) {
          console.error('Failed to save settings to localStorage:', err)
        }
      }
    }, 500)
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
      if (activeTab === 'account') {
        setAccountDraft(prev => ({ ...prev, userAvatar: base64 }))
      } else {
        set('userAvatar', base64)
      }
    }
    reader.readAsDataURL(file)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account': {
        const accountHasChanges =
          accountDraft.userName !== (initial.userName ?? '') ||
          accountDraft.userAvatar !== (initial.userAvatar ?? '')
        return (
          <div style={{ ...styles.tabContent, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <div>
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
                    {accountDraft.userAvatar ? (
                      <img src={accountDraft.userAvatar} alt="头像" style={styles.avatarImage} />
                    ) : (
                      <span style={styles.avatarPlaceholder}>{accountDraft.userName.charAt(0) || '?'}</span>
                    )}
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
                  value={accountDraft.userName}
                  onChange={e => setAccountDraft(prev => ({ ...prev, userName: e.target.value }))}
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

            {/* 底部取消 / 保存按钮 */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 32,
              paddingTop: 20,
              borderTop: '1px solid var(--border-light)',
            }}>
              <button
                style={{
                  padding: '7px 18px',
                  borderRadius: 7,
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'opacity 0.15s',
                }}
                onClick={() => setAccountDraft({
                  userName: initial.userName ?? '',
                  userAvatar: initial.userAvatar ?? '',
                })}
              >
                取消
              </button>
              <button
                disabled={!accountHasChanges || !accountDraft.userName.trim()}
                style={{
                  padding: '7px 18px',
                  borderRadius: 7,
                  border: 'none',
                  background: (!accountHasChanges || !accountDraft.userName.trim())
                    ? 'var(--border-medium)'
                    : '#0094fc',
                  color: (!accountHasChanges || !accountDraft.userName.trim())
                    ? 'var(--text-tertiary)'
                    : '#fff',
                  fontSize: 13,
                  cursor: (!accountHasChanges || !accountDraft.userName.trim()) ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  transition: 'background 0.15s',
                }}
                onClick={() => {
                  if (!accountDraft.userName.trim()) return
                  set('userName', accountDraft.userName.trim())
                  set('userAvatar', accountDraft.userAvatar)
                  message.success('账号信息已保存', 2000)
                }}
              >
                保存
              </button>
            </div>
          </div>
        )
      }

      case 'general':
        return (
          <div style={styles.tabContent}>
            {/* CCSwith 代理模式 */}
            <DesktopRow
              label="使用 CCSwith 代理"
              desc="通过本地 CCSwith 代理调用 API（无需配置 API Key）"
              control={
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={form.useCCSwith ?? false} 
                    onChange={e => set('useCCSwith', e.target.checked)} 
                  />
                  <span className="slider"></span>
                </label>
              }
            />

            {/* CCSwith 代理地址（仅当启用时显示） */}
            {form.useCCSwith && (
              <Field label="CCSwith 代理地址" hint="默认：127.0.0.1:8888">
                <input
                  type="text"
                  style={styles.input}
                  value={form.ccswithAddress || '127.0.0.1:8888'}
                  onChange={e => set('ccswithAddress', e.target.value)}
                  placeholder="127.0.0.1:8888"
                />
              </Field>
            )}

            {/* API Key（仅当未启用 CCSwith 时显示） */}
            {!form.useCCSwith && (
              <>
                <Field label="API Key" required hint="支持 MiniMax / 通义千问 (Qwen) / Claude / OpenAI 的 API Key">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                      <input
                        type={showKey ? 'text' : 'password'}
                        style={{ ...styles.input, flex: 1 }}
                        value={form.apiKey || ''}
                        onChange={e => set('apiKey', e.target.value)}
                        placeholder="输入 API Key"
                      />
                      <button
                        style={styles.toggleBtn}
                        onClick={() => setShowKey(v => !v)}
                        title="切换显示/隐藏"
                      >
                        {showKey ? '隐藏' : '显示'}
                      </button>
                    </div>
                    <button
                      style={{
                        ...styles.toggleBtn,
                        minWidth: 50,
                      }}
                      onClick={async () => {
                        if (!form.apiKey) {
                          message.warning('请先输入 API Key', 2000)
                          return
                        }
                        if (!isElectron()) {
                          message.warning('请在桌面版中使用此功能', 2000)
                          return
                        }
                        
                        // 显示加载状态
                        message.info('正在测试连接...', 1000)
                        
                        try {
                          const result = await window.electron.testAgent({
                            model: form.model,
                            apiKey: form.apiKey,
                          })
                          
                          if (result.success) {
                            message.success('✅ 连接成功！', 3000)
                          } else {
                            message.error(`❌ 连接失败：${result.error}`, 5000)
                          }
                        } catch (error) {
                          message.error('测试失败：' + (error as Error).message, 5000)
                        }
                      }}
                      disabled={!form.apiKey}
                      title={!form.apiKey ? '请先输入 API Key' : '测试连接'}
                    >
                      测试
                    </button>
                  </div>
                </Field>
              </>
            )}

            {/* 模型选择 */}
            <Field label="模型">
              <select
                style={styles.select}
                value={form.model || 'MiniMax-M2.5'}
                onChange={e => set('model', e.target.value)}
              >
                <optgroup label="MiniMax">
                  <option value="MiniMax-M2.5">MiniMax M2.5（推荐）</option>
                  <option value="MiniMax-Text-01">MiniMax Text-01</option>
                </optgroup>
                <optgroup label="通义千问 Qwen">
                  <option value="qwen3-coder-next">Qwen3 Coder Next（最新编程）</option>
                  <option value="qwen-plus">Qwen Plus</option>
                  <option value="qwen-max">Qwen Max</option>
                  <option value="qwen-turbo">Qwen Turbo</option>
                </optgroup>
                <optgroup label="Claude（需 Anthropic Key，仅 Electron）">
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                </optgroup>
              </select>
            </Field>

            <Field label="外观">
              <div style={styles.themeCards}>
                {([
                  { key: 'light' as const, label: '浅色', icon: <SunIcon size={13} /> },
                  { key: 'dark'  as const, label: '黑暗', icon: <MoonIcon size={13} /> },
                  { key: 'system' as const, label: '系统', icon: <DesktopIcon size={13} /> },
                ]).map(({ key, label, icon }) => {
                  const selected = form.theme === key
                  return (
                    <div
                      key={key}
                      onClick={() => set('theme', key)}
                      style={{ flex: 1, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
                    >
                      {/* Mini UI 预览框 */}
                      <div style={{
                        width: '100%',
                        height: 104,
                        borderRadius: 10,
                        border: selected ? '2.5px solid #0094fc' : '2px solid var(--border-medium)',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: selected ? '0 0 0 3px rgba(0,148,252,0.18)' : 'none',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}>
                        <MiniThemePreview mode={key} />
                      </div>
                      {/* 标签 */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 12.5,
                        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: selected ? 500 : 400,
                        transition: 'color 0.15s',
                      }}>
                        {icon}
                        <span>{label}</span>
                      </div>
                    </div>
                  )
                })}
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
              desc={`在桌面任意位置唤醒 ${appConfig.appName}`}
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
              desc={form.commandWhitelist?.length ? `${form.commandWhitelist.length} 条命令` : '允许自动运行的命令'}
              control={<button style={styles.editBtn} onClick={() => setShowCommandWhitelist(true)}>编辑</button>}
            />

            {/* 文件夹访问权限 */}
            <DesktopRow
              label="文件夹访问权限"
              desc={form.folderPermissions?.length ? `${form.folderPermissions.length} 个文件夹` : '已授予读写权限的文件夹'}
              control={<button style={styles.editBtn} onClick={() => setShowFolderPermissions(true)}>编辑</button>}
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
            {/* Permission card - 通知权限卡片 */}
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
                  } else {
                    message.warning('请在桌面版中使用此功能', 3000)
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

      case 'scheduled-tasks':
        return (
          <div style={{ ...styles.tabContent, maxWidth: '100%', padding: 0 }}>
            {/* 定时任务面板内容 - 左右布局 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>定时任务</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  {appConfig.appName} 智能体可以在完成任务后安排再次运行。
                </div>
              </div>
              <button style={styles.manageBtn} onClick={() => onScheduledTasks?.()}>
                管理
              </button>
            </div>
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
      case 'scheduled-tasks': return '定时任务'
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
              <NavItem active={activeTab === 'scheduled-tasks'} onClick={() => setActiveTab('scheduled-tasks')} icon={<AlarmCheckIcon />}>定时任务</NavItem>
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

      {/* 二级弹窗：命令白名单 */}
      {showCommandWhitelist && (
        <CommandWhitelistModal
          commands={form.commandWhitelist ?? []}
          onSave={(commands) => {
            set('commandWhitelist', commands)
            setShowCommandWhitelist(false)
          }}
          onClose={() => setShowCommandWhitelist(false)}
        />
      )}

      {/* 二级弹窗：文件夹访问权限 */}
      {showFolderPermissions && (
        <FolderPermissionsModal
          folders={form.folderPermissions ?? []}
          onSave={(folders) => {
            set('folderPermissions', folders)
            setShowFolderPermissions(false)
          }}
          onClose={() => setShowFolderPermissions(false)}
        />
      )}
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

// ─── 主题 Mini UI 预览 ─────────────────────────────────────────────────────────

const THEME_SCHEME = {
  light: {
    bg: '#f5f5f5',
    sidebar: '#ebebeb',
    sidebarBorder: '#e0e0e0',
    navItem: '#d4d4d4',
    tabBar: '#e8e8e8',
    bar1: '#d8d8d8',
    bar2: '#e2e2e2',
    inputBg: '#efefef',
    runBg: '#ffffff',
    runColor: '#1a1a1a',
    runShadow: '0 1px 3px rgba(0,0,0,0.14)',
    iconColor: '#c8c8c8',
  },
  dark: {
    bg: '#1c1c1c',
    sidebar: '#252525',
    sidebarBorder: '#303030',
    navItem: '#3d3d3d',
    tabBar: '#222222',
    bar1: '#3a3a3a',
    bar2: '#313131',
    inputBg: '#2a2a2a',
    runBg: '#ffffff',
    runColor: '#1a1a1a',
    runShadow: '0 1px 4px rgba(0,0,0,0.4)',
    iconColor: '#404040',
  },
}

function MiniThemePane({ s, clipLeft, clipRight }: {
  s: typeof THEME_SCHEME.light
  clipLeft?: boolean
  clipRight?: boolean
}) {
  return (
    <div style={{
      position: 'absolute',
      top: 0, bottom: 0,
      left: clipRight ? '50%' : 0,
      right: clipLeft ? '50%' : 0,
      background: s.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Tab bar 顶部 */}
      <div style={{ height: 16, background: s.tabBar, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
        <div style={{ width: 28, height: 6, borderRadius: 3, background: s.navItem }} />
        <div style={{ width: 20, height: 6, borderRadius: 3, background: s.sidebarBorder }} />
      </div>

      {/* 主体区域：侧边栏 + 内容 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 侧边栏 */}
        <div style={{ width: 26, background: s.sidebar, borderRight: `1px solid ${s.sidebarBorder}`, flexShrink: 0, padding: '7px 4px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[100, 70, 70, 80].map((w, i) => (
            <div key={i} style={{ height: 4, borderRadius: 2, background: s.navItem, width: `${w}%` }} />
          ))}
          <div style={{ flex: 1 }} />
          {/* 底部用户头像占位 */}
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: s.navItem, alignSelf: 'center' }} />
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, padding: '8px 8px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
          {/* 内容占位条 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ height: 5, borderRadius: 2.5, background: s.bar1, width: '82%' }} />
            <div style={{ height: 5, borderRadius: 2.5, background: s.bar2, width: '58%' }} />
            <div style={{ height: 5, borderRadius: 2.5, background: s.bar2, width: '70%' }} />
          </div>

          {/* 底部输入栏 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s.inputBg, borderRadius: 6, padding: '3px 5px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.iconColor }} />
            {/* Run 按钮 */}
            <div style={{
              background: s.runBg,
              color: s.runColor,
              borderRadius: 6,
              padding: '1.5px 5px',
              fontSize: 6,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              boxShadow: s.runShadow,
              lineHeight: 1.5,
              letterSpacing: 0.2,
            }}>
              <svg width="5" height="5" viewBox="0 0 8 8" fill="none">
                <path d="M4 7V1M1 4l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Run
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniThemePreview({ mode }: { mode: 'light' | 'dark' | 'system' }) {
  if (mode === 'system') {
    return (
      <>
        <MiniThemePane s={THEME_SCHEME.light} clipLeft />
        {/* 中间分割线 */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(128,128,128,0.25)', zIndex: 1 }} />
        <MiniThemePane s={THEME_SCHEME.dark} clipRight />
      </>
    )
  }
  return <MiniThemePane s={THEME_SCHEME[mode]} />
}

// ──────────────────────────────────────────────────────────────────────────────

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
    borderBottom: 'none',
  },
  sidebarTitle: {
    fontSize: 14, fontWeight: 400, color: 'var(--text-primary)',
  },
  sidebarMenu: {
    flex: 1, padding: '16px 12px', overflowY: 'auto',
  },
  sidebarSection: {
    marginBottom: 16,
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
    display: 'flex', gap: 14, marginBottom: 8,
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

// ─── 命令白名单弹窗 ────────────────────────────────────────────────────────────

function CommandWhitelistModal({
  commands,
  onSave,
  onClose,
}: {
  commands: string[]
  onSave: (commands: string[]) => void
  onClose: () => void
}) {
  const [list, setList] = useState<string[]>([...commands])
  const [newCommand, setNewCommand] = useState('')

  const addCommand = () => {
    const trimmed = newCommand.trim()
    if (!trimmed || list.includes(trimmed)) return
    setList(prev => [...prev, trimmed])
    setNewCommand('')
  }

  const removeCommand = (index: number) => {
    setList(prev => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addCommand()
  }

  return (
    <div
      style={subModalStyles.backdrop}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={subModalStyles.panel}>
        {/* 标题栏 */}
        <div style={subModalStyles.header}>
          <div>
            <div style={subModalStyles.title}>命令白名单</div>
            <div style={subModalStyles.subtitle}>允许以下命令自动运行，无需每次确认</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* 命令列表 */}
        <div style={subModalStyles.listArea}>
          {list.length === 0 ? (
            <div style={subModalStyles.empty}>暂无命令，请在下方添加</div>
          ) : (
            list.map((cmd, i) => (
              <div key={i} style={subModalStyles.listItem}>
                <span style={subModalStyles.cmdPrompt}>$</span>
                <span style={subModalStyles.cmdText}>{cmd}</span>
                <button
                  style={subModalStyles.removeBtn}
                  onClick={() => removeCommand(i)}
                  title="删除"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* 添加输入框 */}
        <div style={subModalStyles.addRow}>
          <input
            type="text"
            value={newCommand}
            onChange={e => setNewCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入命令，例如：npm run dev"
            style={subModalStyles.addInput}
          />
          <button
            onClick={addCommand}
            disabled={!newCommand.trim()}
            style={{
              ...subModalStyles.addBtn,
              opacity: newCommand.trim() ? 1 : 0.45,
              cursor: newCommand.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            添加
          </button>
        </div>

        {/* 底部操作 */}
        <div style={subModalStyles.footer}>
          <button style={styles.editBtn} onClick={onClose}>取消</button>
          <button style={subModalStyles.confirmBtn} onClick={() => onSave(list)}>完成</button>
        </div>
      </div>
    </div>
  )
}

// ─── 文件夹访问权限弹窗 ────────────────────────────────────────────────────────

function FolderPermissionsModal({
  folders,
  onSave,
  onClose,
}: {
  folders: FolderPermission[]
  onSave: (folders: FolderPermission[]) => void
  onClose: () => void
}) {
  const [list, setList] = useState<FolderPermission[]>([...folders])

  const addFolder = async () => {
    if (!isElectron()) {
      message.warning('请在桌面版中使用此功能', 3000)
      return
    }
    const folder = await window.electron.pickFolder()
    if (folder && !list.find(f => f.path === folder)) {
      setList(prev => [...prev, { path: folder, permission: 'read-write' }])
    }
  }

  const removeFolder = (index: number) => {
    setList(prev => prev.filter((_, i) => i !== index))
  }

  const updatePermission = (index: number, permission: FolderPermission['permission']) => {
    setList(prev => prev.map((f, i) => i === index ? { ...f, permission } : f))
  }

  return (
    <div
      style={subModalStyles.backdrop}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ ...subModalStyles.panel, width: 520 }}>
        {/* 标题栏 */}
        <div style={subModalStyles.header}>
          <div>
            <div style={subModalStyles.title}>文件夹访问权限</div>
            <div style={subModalStyles.subtitle}>为 Agent 授予对特定文件夹的读写权限</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* 文件夹列表 */}
        <div style={subModalStyles.listArea}>
          {list.length === 0 ? (
            <div style={subModalStyles.empty}>暂无授权文件夹，点击下方按钮添加</div>
          ) : (
            list.map((item, i) => (
              <div key={i} style={subModalStyles.listItem}>
                {/* 文件夹图标 */}
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ color: '#ffa940', flexShrink: 0 }}>
                  <path d="M2 6a2 2 0 012-2h3.586a1 1 0 01.707.293l1.414 1.414A1 1 0 0010.414 6H16a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="currentColor"/>
                </svg>
                {/* 路径 */}
                <span style={subModalStyles.folderPath}>{item.path}</span>
                {/* 权限选择 */}
                <select
                  value={item.permission}
                  onChange={e => updatePermission(i, e.target.value as FolderPermission['permission'])}
                  style={subModalStyles.permSelect}
                >
                  <option value="read">只读</option>
                  <option value="write">只写</option>
                  <option value="read-write">读写</option>
                </select>
                {/* 删除按钮 */}
                <button
                  style={subModalStyles.removeBtn}
                  onClick={() => removeFolder(i)}
                  title="移除"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* 添加文件夹按钮 */}
        <div style={{ padding: '0 24px 16px' }}>
          <button onClick={addFolder} style={subModalStyles.addFolderBtn}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            添加文件夹
          </button>
        </div>

        {/* 底部操作 */}
        <div style={subModalStyles.footer}>
          <button style={styles.editBtn} onClick={onClose}>取消</button>
          <button style={subModalStyles.confirmBtn} onClick={() => onSave(list)}>完成</button>
        </div>
      </div>
    </div>
  )
}

// ─── 二级弹窗共用样式 ──────────────────────────────────────────────────────────

const subModalStyles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    backdropFilter: 'blur(1px)',
  },
  panel: {
    width: 480,
    background: 'var(--modal-bg)',
    borderRadius: 12,
    boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px var(--border-dark)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--border-light)',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    lineHeight: 1.4,
  },
  listArea: {
    padding: '12px 24px',
    maxHeight: 300,
    overflowY: 'auto',
    minHeight: 80,
  },
  empty: {
    textAlign: 'center',
    padding: '32px 0',
    color: 'var(--text-tertiary)',
    fontSize: 13,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    marginBottom: 6,
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    border: '1px solid var(--border-light)',
  },
  cmdPrompt: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  cmdText: {
    flex: 1,
    fontSize: 13,
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
    wordBreak: 'break-all' as const,
    minWidth: 0,
  },
  folderPath: {
    flex: 1,
    fontSize: 12.5,
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    minWidth: 0,
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    padding: '4px',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'color 0.15s',
  },
  permSelect: {
    border: '1px solid var(--border-medium)',
    borderRadius: 6,
    padding: '3px 6px',
    fontSize: 12,
    color: 'var(--text-secondary)',
    background: 'var(--bg-primary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
    outline: 'none',
  },
  addRow: {
    padding: '4px 24px 16px',
    display: 'flex',
    gap: 8,
  },
  addInput: {
    flex: 1,
    border: '1px solid var(--border-medium)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    outline: 'none',
    fontFamily: 'monospace',
  },
  addBtn: {
    border: 'none',
    background: '#0094fc',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    color: 'white',
    fontFamily: 'inherit',
    fontWeight: 500,
    flexShrink: 0,
  },
  addFolderBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    border: '1px dashed var(--border-medium)',
    background: 'transparent',
    borderRadius: 8,
    padding: '9px 16px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, color 0.15s',
  },
  footer: {
    padding: '14px 24px',
    borderTop: '1px solid var(--border-light)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmBtn: {
    border: 'none',
    background: '#0094fc',
    borderRadius: 8,
    padding: '8px 22px',
    fontSize: 13,
    color: 'white',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 500,
  },
}
