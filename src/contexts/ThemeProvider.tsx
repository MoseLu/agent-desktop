import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

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

// 应用主题到 DOM
function applyTheme(resolvedTheme: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  
  // 明确设置主题属性，而不是移除
  root.setAttribute('data-theme', resolvedTheme)
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
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    getResolvedTheme(defaultTheme)
  )

  // 设置主题并应用
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    const resolved = getResolvedTheme(newTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
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
        applyTheme(resolved)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // 初始应用主题
  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [])

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
