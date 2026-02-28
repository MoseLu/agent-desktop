import React, { useState, useEffect, useRef } from 'react'
import { appConfig } from '@config'
import type { UserAccount } from '@types'
import defaultAvatar from '@asserts/avatar.jpg'

interface Props {
  onLogin: (userName: string) => void
}

interface AccountWithSelected extends UserAccount {
  selected?: boolean
}

export default function LoginPage({ onLogin }: Props) {
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserAvatar, setNewUserAvatar] = useState('')
  const [error, setError] = useState('')
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载账号列表
  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const accs = await window.electron.getAccounts()
      setAccounts(accs)
    } catch (err) {
      console.error('Failed to load accounts:', err)
    }
  }

  const handleSelectAccount = (userName: string) => {
    onLogin(userName)
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserName.trim()) {
      setError('请输入用户名')
      return
    }

    setCreating(true)
    setError('')

    try {
      const result = await window.electron.createAccount(newUserName.trim(), newUserAvatar)
      if (result.ok) {
        // 创建成功后自动登录
        onLogin(newUserName.trim())
      } else {
        setError(result.error || '创建失败')
        setCreating(false)
      }
    } catch (err) {
      setError('创建失败，请重试')
      setCreating(false)
    }
  }

  const handleAvatarUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('头像大小不能超过 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setNewUserAvatar(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteAccount = async (e: React.MouseEvent, userName: string) => {
    e.stopPropagation()
    if (!confirm(`确定要删除账号 "${userName}" 吗？`)) return

    try {
      const result = await window.electron.deleteAccount(userName)
      if (result.ok) {
        loadAccounts()
      } else {
        setError(result.error || '删除失败')
      }
    } catch (err) {
      setError('删除失败')
    }
  }

  // 创建账号表单
  if (showCreateForm || accounts.length === 0) {
    return (
      <div style={s.root}>
        <div style={s.card}>
          <div style={s.logoWrap}>
            <div style={s.logoCircle}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="var(--text-primary)" />
                <path d="M8 22L16 10L24 22H8Z" fill="var(--bg-primary)" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h1 style={s.title}>{appConfig.appName}</h1>
          <p style={s.subtitle}>创建账号以开始使用</p>

          <form onSubmit={handleCreateAccount} style={s.form}>
            {/* 头像上传 */}
            <div style={s.avatarSection}>
              <div
                style={s.avatarPreview}
                onClick={handleAvatarUpload}
                onMouseEnter={() => setIsHoveringAvatar(true)}
                onMouseLeave={() => setIsHoveringAvatar(false)}
              >
                {newUserAvatar ? (
                  <img src={newUserAvatar} alt="头像" style={s.avatarImage} />
                ) : (
                  <img src={defaultAvatar} alt="默认头像" style={s.avatarImage} />
                )}
                {isHoveringAvatar && (
                  <div style={s.avatarOverlay}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 4v16m8-8H4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <span style={s.avatarHint}>点击上传头像</span>
            </div>

            {/* 用户名输入 */}
            <div style={s.fieldWrap}>
              <input
                autoFocus
                type="text"
                value={newUserName}
                onChange={e => { setNewUserName(e.target.value); setError('') }}
                placeholder="请输入用户名"
                maxLength={32}
                style={{ ...s.input, ...(error ? s.inputError : {}) }}
              />
              {error && <span style={s.errorMsg}>{error}</span>}
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={creating || !newUserName.trim()}
              style={{
                ...s.btn,
                opacity: creating || !newUserName.trim() ? 0.5 : 1,
                cursor: creating || !newUserName.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {creating ? '创建中...' : '创建账号'}
            </button>
          </form>

          {accounts.length > 0 && (
            <button
              style={s.backBtn}
              onClick={() => setShowCreateForm(false)}
            >
              返回账号列表
            </button>
          )}

          <p style={s.hint}>用户名用于标识您的账号，后续可随时修改</p>
        </div>
      </div>
    )
  }

  // 账号选择列表
  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.logoWrap}>
          <div style={s.logoCircle}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--text-primary)" />
              <path d="M8 22L16 10L24 22H8Z" fill="var(--bg-primary)" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <h1 style={s.title}>{appConfig.appName}</h1>
        <p style={s.subtitle}>选择账号以继续</p>

        {/* 账号列表 */}
        <div style={s.accountList}>
          {accounts.map(account => (
            <div
              key={account.userName}
              style={s.accountCard}
              onClick={() => handleSelectAccount(account.userName)}
            >
              {/* 头像 */}
              <div style={s.accountAvatar}>
                {account.userAvatar ? (
                  <img src={account.userAvatar} alt={account.userName} style={s.accountAvatarImage} />
                ) : (
                  <img src={defaultAvatar} alt={account.userName} style={s.accountAvatarImage} />
                )}
              </div>
              <div style={s.accountAvatar}>
                {account.userAvatar ? (
                  <img src={account.userAvatar} alt={account.userName} style={s.accountAvatarImage} />
                ) : (
                  <span style={s.accountAvatarPlaceholder}>
                    {account.userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* 用户名 */}
              <span style={s.accountName}>{account.userName}</span>

              {/* 删除按钮 */}
              {accounts.length > 1 && (
                <button
                  style={s.deleteBtn}
                  onClick={(e) => handleDeleteAccount(e, account.userName)}
                  title="删除账号"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 添加新账号按钮 */}
        <button
          style={s.addAccountBtn}
          onClick={() => setShowCreateForm(true)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          添加新账号
        </button>

        <p style={s.hint}>本地账号仅用于区分不同的会话记录</p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'var(--bg-primary)',
  },
  card: {
    width: 400,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: '48px 40px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)',
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  },
  logoWrap: {
    marginBottom: 4,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    margin: 0,
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    marginTop: 8,
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform 0.15s, box-shadow 0.15s',
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
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  },
  avatarHint: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
  },
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  input: {
    width: '100%',
    height: 44,
    border: '1px solid var(--border-medium)',
    borderRadius: 8,
    padding: '0 14px',
    fontSize: 14,
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  inputError: {
    borderColor: 'var(--error)',
  },
  errorMsg: {
    fontSize: 12,
    color: 'var(--error)',
    paddingLeft: 2,
  },
  btn: {
    width: '100%',
    height: 44,
    background: 'var(--text-primary)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  },
  backBtn: {
    width: '100%',
    height: 40,
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-medium)',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  hint: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  accountList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 8,
    maxHeight: 320,
    overflowY: 'auto' as const,
  },
  accountCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s',
    position: 'relative',
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  accountAvatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  accountName: {
    flex: 1,
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    opacity: 0,
    transition: 'all 0.15s',
  },
  addAccountBtn: {
    width: '100%',
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px dashed var(--border-medium)',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
}
