import React from 'react'

export interface AvatarProps {
  /** 头像图片 URL（base64 或网络地址） */
  src?: string
  /** 用户名，用于显示首字母 */
  name: string
  /** 头像尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否折叠状态 */
  collapsed?: boolean
  /** 自定义样式 */
  style?: React.CSSProperties
}

const sizeMap = {
  sm: 32,
  md: 36,
  lg: 48,
} as const

/**
 * 头像组件
 * 
 * 支持图片头像和字母头像两种方式：
 * - 有图片时显示图片
 * - 无图片时显示用户名首字母
 * 
 * @example
 * ```tsx
 * // 字母头像
 * <Avatar name="开发者" />
 * 
 * // 图片头像
 * <Avatar name="开发者" src="data:image/png;base64,..." />
 * 
 * // 小号头像
 * <Avatar name="开发者" size="sm" collapsed />
 * ```
 */
export function Avatar({ src, name, size = 'md', collapsed = false, style }: AvatarProps) {
  const resolvedSize = collapsed ? sizeMap.sm : sizeMap[size]
  const displayName = name || '用户'
  
  const baseStyle: React.CSSProperties = {
    width: resolvedSize,
    height: resolvedSize,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: collapsed ? 14 : size === 'sm' ? 14 : size === 'md' ? 15 : 20,
    fontWeight: 600,
    flexShrink: 0,
    overflow: 'hidden',
    cursor: collapsed ? 'pointer' : 'default',
    transition: 'transform 0.15s',
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
    ...style,
  }

  if (src) {
    return (
      <div style={baseStyle}>
        <img 
          src={src} 
          alt={displayName} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }} 
        />
      </div>
    )
  }

  return (
    <div style={baseStyle}>
      <span style={{
        fontSize: collapsed ? 14 : size === 'sm' ? 14 : size === 'md' ? 15 : 20,
        fontWeight: 600,
        color: 'white',
        lineHeight: 1,
      }}>
        {displayName.charAt(0)}
      </span>
    </div>
  )
}
