import React, { useState } from 'react'
import { appConfig } from '@config'

interface Props {
  onLogin: (userName: string) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请输入用户名')
      return
    }
    onLogin(trimmed)
  }

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
        <p style={s.subtitle}>请输入用户名以开始使用</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.fieldWrap}>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="用户名"
              maxLength={32}
              style={{ ...s.input, ...(error ? s.inputError : {}) }}
            />
            {error && <span style={s.errorMsg}>{error}</span>}
          </div>
          <button
            type="submit"
            style={{ ...s.btn, opacity: name.trim() ? 1 : 0.5 }}
          >
            开始使用
          </button>
        </form>

        <p style={s.hint}>用户名用于隔离本地会话记录，无需密码</p>
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
    width: 360,
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
    gap: 12,
    marginTop: 8,
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
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  },
  hint: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
    textAlign: 'center',
    lineHeight: 1.5,
  },
}
