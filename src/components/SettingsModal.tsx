import React, { useState } from 'react'
import type { Settings } from '../types'

const MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4（推荐）' },
  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5（最强）' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5（最快）' },
]

type SettingsTab = 'account' | 'general' | 'billing' | 'points' | 'scheduled' | 'desktop-general' | 'notifications'

interface Props {
  initial: Settings
  onSave: (s: Partial<Settings>) => Promise<void>
  onClose: () => void
}

export default function SettingsModal({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...initial })
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  // 桌面设置状态
  const [theme, setTheme] = useState('light')
  const [language, setLanguage] = useState('zh-CN')
  const [autoOpenTask, setAutoOpenTask] = useState(true)
  const [desktopNotifications, setDesktopNotifications] = useState(true)
  const [taskCompleteNotify, setTaskCompleteNotify] = useState(true)
  const [soundNotify, setSoundNotify] = useState(false)

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const pickFolder = async () => {
    const folder = await window.electron.pickFolder()
    if (folder) set('workspace', folder)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div style={styles.tabContent}>
            <div style={styles.sectionTitle}>账号</div>
            <div style={styles.sectionDesc}>个性化设置他人在 MiniMax Agent 上看到和与您互动的方式</div>
            
            <Field label="用户名 *" required>
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

            <Field label="当前套餐">
              <div style={styles.planDisplay}>
                <span style={styles.planName}>{form.userPlan}</span>
                <button style={styles.upgradeBtn}>升级套餐</button>
              </div>
            </Field>
          </div>
        )

      case 'general':
        return (
          <div style={styles.tabContent}>
            <div style={styles.sectionTitle}>通用设置</div>
            <div style={styles.sectionDesc}>配置 Agent 的核心功能</div>

            <Field label="API Key" hint="存储在本地，不会上传" extra={<a href="https://console.anthropic.com/keys" style={styles.link} target="_blank">获取 Key ↗</a>}>
              <div style={styles.inputGroup}>
                <input
                  type={showKey ? 'text' : 'password'}
                  style={styles.input}
                  value={form.apiKey}
                  onChange={e => set('apiKey', e.target.value)}
                  placeholder="sk-ant-api03-..."
                />
                <button style={styles.toggleBtn} onClick={() => setShowKey(p => !p)}>
                  {showKey ? '隐藏' : '显示'}
                </button>
              </div>
            </Field>

            <Field label="模型选择">
              <select style={styles.select} value={form.model || 'claude-sonnet-4-20250514'} onChange={e => set('model', e.target.value)}>
                {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>

            <Field label={`最大步数 · ${form.maxSteps || 50}`}>
              <input
                type="range" min={5} max={100} step={5}
                style={styles.range}
                value={form.maxSteps || 50}
                onChange={e => set('maxSteps', Number(e.target.value))}
              />
              <div style={styles.rangeLabels}><span>5（快速）</span><span>100（深度）</span></div>
            </Field>

            <Field label="工作区目录" hint="Agent 在此目录内读写文件">
              <div style={styles.inputGroup}>
                <input
                  type="text"
                  style={styles.input}
                  value={form.workspace || ''}
                  onChange={e => set('workspace', e.target.value)}
                  placeholder="C:\\Users\\你的用户名\\workspace"
                />
                <button style={styles.toggleBtn} onClick={pickFolder}>浏览</button>
              </div>
            </Field>

            {!form.apiKey && (
              <div style={styles.warning}>
                ⚠ 需要填写 API Key 才能使用 Agent 功能
              </div>
            )}
          </div>
        )

      case 'billing':
        return (
          <div style={styles.tabContent}>
            <div style={styles.sectionTitle}>账单</div>
            <div style={styles.sectionDesc}>查看和管理您的订阅与消费记录</div>
            
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📄</div>
              <div style={styles.emptyText}>暂无账单记录</div>
              <div style={styles.emptyDesc}>订阅服务后，账单信息将显示在这里</div>
            </div>
          </div>
        )

      case 'points':
        return (
          <div style={styles.tabContent}>
            <div style={styles.sectionTitle}>积分</div>
            <div style={styles.sectionDesc}>查看积分余额和积分获取记录</div>
            
            <div style={styles.pointsCard}>
              <div style={styles.pointsAmount}>1177</div>
              <div style={styles.pointsLabel}>可用积分</div>
            </div>

            <div style={styles.pointsActions}>
              <button style={styles.pointsBtn}>积分记录</button>
              <button style={styles.pointsBtnPrimary}>获取积分</button>
            </div>
          </div>
        )

      case 'scheduled':
        return (
          <div style={styles.tabContent}>
            <div style={styles.sectionTitle}>定时任务</div>
            <div style={styles.sectionDesc}>设置自动执行的周期性任务</div>
            
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>⏰</div>
              <div style={styles.emptyText}>暂无定时任务</div>
              <button style={styles.addTaskBtn}>+ 创建定时任务</button>
            </div>
          </div>
        )

      case 'desktop-general':
        return (
          <div style={styles.tabContent}>
            <div style={styles.sectionTitle}>桌面设置 - 通用</div>
            <div style={styles.sectionDesc}>自定义桌面应用的外观和行为</div>
            
            <Field label="主题">
              <select style={styles.select} value="light">
                <option value="light">浅色</option>
                <option value="dark">深色</option>
                <option value="auto">跟随系统</option>
              </select>
            </Field>

            <Field label="语言">
              <select style={styles.select} value="zh-CN">
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
              </select>
            </Field>

            <Field label="启动时自动打开新任务">
              <label style={styles.checkbox}>
                <input type="checkbox" defaultChecked />
                <span>启用</span>
              </label>
            </Field>
          </div>
        )

      case 'notifications':
        return (
          <div style={styles.tabContent}>
            <div style={styles.sectionTitle}>通知</div>
            <div style={styles.sectionDesc}>管理应用通知和提醒设置</div>
            
            <Field label="桌面通知">
              <label style={styles.checkbox}>
                <input type="checkbox" checked={desktopNotifications} onChange={e => setDesktopNotifications(e.target.checked)} />
                <span>允许应用发送通知</span>
              </label>
            </Field>

            <Field label="任务完成提醒">
              <label style={styles.checkbox}>
                <input type="checkbox" checked={taskCompleteNotify} onChange={e => setTaskCompleteNotify(e.target.checked)} />
                <span>任务完成时显示通知</span>
              </label>
            </Field>

            <Field label="声音提醒">
              <label style={styles.checkbox}>
                <input type="checkbox" checked={soundNotify} onChange={e => setSoundNotify(e.target.checked)} />
                <span>播放提示音</span>
              </label>
            </Field>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerTitle}>设置</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.body}>
          {/* Left sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarSection}>
              <div style={styles.sidebarSectionTitle}>设置</div>
              <NavItem active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={<UserIcon />}>账号</NavItem>
              <NavItem active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<SettingsIcon />}>通用</NavItem>
              <NavItem active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={<BillingIcon />}>账单</NavItem>
              <NavItem active={activeTab === 'points'} onClick={() => setActiveTab('points')} icon={<PointsIcon />}>积分</NavItem>
              <NavItem active={activeTab === 'scheduled'} onClick={() => setActiveTab('scheduled')} icon={<ClockIcon />}>定时任务</NavItem>
            </div>

            <div style={styles.sidebarSection}>
              <div style={styles.sidebarSectionTitle}>桌面设置</div>
              <NavItem active={activeTab === 'desktop-general'} onClick={() => setActiveTab('desktop-general')} icon={<DesktopIcon />}>通用</NavItem>
              <NavItem active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<BellIcon />}>通知</NavItem>
            </div>
          </div>

          {/* Right content */}
          <div style={styles.content}>
            {renderTabContent()}
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>取消</button>
          <button style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
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

function Field({ label, hint, extra, children, required }: { label: string; hint?: string; extra?: React.ReactNode; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={styles.fieldLabel}>
          {label}
          {required && <span style={{ color: '#ff4444', marginLeft: 4 }}>*</span>}
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

function DesktopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 15h8M9 13v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(2px)',
  },
  modal: {
    width: 800, height: 520, background: '#fff', borderRadius: 12,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  headerTitle: {
    fontSize: 16, fontWeight: 600, color: '#1a1a1a',
  },
  closeBtn: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 24, lineHeight: 1, padding: '4px 8px' },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  sidebar: {
    width: 220, background: '#fafafa', borderRight: '1px solid #f0f0f0',
    padding: '16px 12px', overflowY: 'auto',
  },
  sidebarSection: {
    marginBottom: 24,
  },
  sidebarSectionTitle: {
    fontSize: 11, fontWeight: 600, color: '#999',
    padding: '0 12px', marginBottom: 8, letterSpacing: '0.03em',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8,
    cursor: 'pointer', fontSize: 13.5, color: '#555',
    transition: 'all 0.15s', marginBottom: 2,
  },
  navItemActive: {
    background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    color: '#1a1a1a', fontWeight: 500,
  },
  navItemText: {
    flex: 1,
  },
  content: {
    flex: 1, padding: '24px 28px', overflowY: 'auto',
  },
  tabContent: {
    maxWidth: 520,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13, color: '#999', marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 12.5, fontWeight: 600, color: '#555', letterSpacing: '0.02em',
  },
  fieldHint: {
    fontSize: 11, color: '#bbb',
  },
  input: {
    width: '100%', border: '1px solid #e8e8e8', borderRadius: 8,
    padding: '10px 12px', fontSize: 13.5, color: '#333', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  inputGroup: { display: 'flex', gap: 6 },
  select: {
    width: '100%', border: '1px solid #e8e8e8', borderRadius: 8,
    padding: '10px 12px', fontSize: 13.5, color: '#333', outline: 'none',
    background: '#fff', fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  toggleBtn: {
    border: '1px solid #e8e8e8', background: '#fafafa', borderRadius: 8,
    padding: '0 16px', cursor: 'pointer', fontSize: 12.5, color: '#666', fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  range: { width: '100%', accentColor: '#1a1a1a' },
  rangeLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#bbb', marginTop: 6 },
  link: { fontSize: 11.5, color: '#2196f3', textDecoration: 'none', fontWeight: 500 },
  warning: {
    padding: '12px 16px', background: '#fff8e1', border: '1px solid #ffe082',
    borderRadius: 8, fontSize: 12.5, color: '#f57c00', marginTop: 8,
  },
  footer: {
    padding: '16px 20px', borderTop: '1px solid #f0f0f0',
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    background: '#fafafa',
  },
  cancelBtn: {
    border: '1px solid #e8e8e8', background: '#fff', borderRadius: 8,
    padding: '9px 20px', cursor: 'pointer', fontSize: 13.5, color: '#666', fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  saveBtn: {
    background: '#1a1a1a', border: 'none', borderRadius: 8,
    padding: '9px 24px', cursor: 'pointer', fontSize: 13.5, color: '#fff',
    fontWeight: 500, fontFamily: 'inherit', transition: 'opacity 0.15s',
  },
  uidDisplay: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', background: '#fafafa', borderRadius: 8,
    border: '1px solid #e8e8e8',
  },
  uidText: {
    fontSize: 13, color: '#666', fontFamily: 'monospace',
  },
  copyBtn: {
    background: 'none', border: 'none', color: '#2196f3',
    cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
  },
  planDisplay: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', background: '#fafafa', borderRadius: 8,
    border: '1px solid #e8e8e8',
  },
  planName: {
    fontSize: 13.5, fontWeight: 500, color: '#333',
  },
  upgradeBtn: {
    background: '#1a1a1a', border: 'none', borderRadius: 16,
    padding: '4px 12px', color: '#fff', fontSize: 12, fontWeight: 500,
    cursor: 'pointer',
  },
  pointsCard: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: 12, padding: '24px', color: '#fff',
    textAlign: 'center', marginBottom: 20,
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
    flex: 1, border: '1px solid #e8e8e8', background: '#fff',
    borderRadius: 8, padding: '10px', fontSize: 13.5, color: '#666',
    cursor: 'pointer', fontWeight: 500,
  },
  pointsBtnPrimary: {
    flex: 1, border: 'none', background: '#1a1a1a',
    borderRadius: 8, padding: '10px', fontSize: 13.5, color: '#fff',
    cursor: 'pointer', fontWeight: 500,
  },
  emptyState: {
    textAlign: 'center', padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: 48, marginBottom: 12, opacity: 0.5,
  },
  emptyText: {
    fontSize: 15, fontWeight: 500, color: '#666', marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13, color: '#999', marginBottom: 20,
  },
  addTaskBtn: {
    background: '#1a1a1a', border: 'none', borderRadius: 8,
    padding: '10px 24px', color: '#fff', fontSize: 13.5,
    fontWeight: 500, cursor: 'pointer',
  },
  checkbox: {
    display: 'flex', alignItems: 'center', gap: 10,
    cursor: 'pointer', fontSize: 13.5, color: '#333',
  },
}
