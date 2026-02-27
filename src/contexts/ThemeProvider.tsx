import React, { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// 检测系统主题
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 根据设置获取实际应用的主题
function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

// 应用主题到 DOM（无闪烁：先禁用过渡，切换属性，再下一帧恢复）
function applyTheme(resolvedTheme: 'light' | 'dark') {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.setAttribute('data-no-transition', '')
  root.setAttribute('data-theme', resolvedTheme)

  // 两帧后恢复过渡，确保浏览器已完成绘制
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.removeAttribute('data-no-transition')
    })
  })
}

// 从 localStorage 读取上次主题，用于首屏即刻应用（防止初始闪烁）
function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem('app-theme')
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* ignore */ }
  return null
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  onThemeChange?: (theme: Theme) => void
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  onThemeChange
}: ThemeProviderProps) {
  // 优先使用 localStorage 缓存的主题，避免异步加载设置时的初始闪烁
  const initialTheme = getStoredTheme() ?? defaultTheme
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    getResolvedTheme(initialTheme)
  )

  // 设置主题：先同步更新 DOM（消除切换闪烁），再更新 React 状态
  const setTheme = useCallback((newTheme: Theme) => {
    const resolved = getResolvedTheme(newTheme)
    // 立即同步应用到 DOM，在 React 重新渲染前完成，彻底消除闪烁
    applyTheme(resolved)
    // 同步到 localStorage 供下次启动时即刻读取
    try { localStorage.setItem('app-theme', newTheme) } catch { /* ignore */ }
    setThemeState(newTheme)
    setResolvedTheme(resolved)
    onThemeChange?.(newTheme)
  }, [onThemeChange])

  // 切换主题
  const toggleTheme = useCallback(() => {
    const themes: Theme[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
  }, [theme, setTheme])

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      if (theme === 'system') {
        const resolved = getSystemTheme()
        setResolvedTheme(resolved)
        // applyTheme 由 useLayoutEffect 统一处理
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // 将主题同步应用到 DOM：useLayoutEffect 在 React 渲染（含 antd ConfigProvider 更新）完成后、
  // 浏览器绘制前同步执行，确保 CSS 变量切换与 antd 算法切换在同一帧内完成，消除闪烁
  useLayoutEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export type { Theme }
