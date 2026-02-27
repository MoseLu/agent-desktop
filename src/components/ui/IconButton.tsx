import React, { forwardRef, Ref } from 'react'
import { Button } from 'antd'
import type { ButtonProps } from 'antd'

export type IconButtonVariant = 'bordered' | 'borderless'

export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'type' | 'variant'> {
  /** 图标按钮类型 */
  variant?: IconButtonVariant
  /** 图标元素 */
  icon: React.ReactNode
  /** 标题（tooltip） */
  title?: string
  /** 是否激活状态 */
  active?: boolean
}

/**
 * 图标按钮组件
 * 
 * 基于 antd Button 封装，支持 tooltip
 * 
 * 提供两种类型：
 * - bordered: 带边框，用于输入框底部功能区
 * - borderless: 无边框，用于侧边栏 logo 区域等
 * 
 * 尺寸：36px × 36px
 * 
 * @example
 * ```tsx
 * // 无边框按钮（侧边栏折叠按钮）
 * <IconButton variant="borderless" icon={<CollapseIcon />} onClick={handleClick} />
 * 
 * // 带边框按钮（输入框工具栏）
 * <IconButton variant="bordered" icon={<AttachIcon />} onClick={handleClick} />
 * 
 * // 带 tooltip
 * <IconButton variant="borderless" icon={<CollapseIcon />} title="折叠" />
 * ```
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    variant = 'borderless',
    icon,
    onClick,
    title,
    disabled = false,
    style,
    active = false,
    ...props
  },
  ref
) {
  const baseStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    transition: 'all 0.15s ease',
  }

  const variantStyles: Record<IconButtonVariant, React.CSSProperties> = {
    borderless: {
      background: 'transparent',
      border: 'none',
      color: 'var(--icon-tertiary)',
      ...baseStyle,
    },
    bordered: {
      background: 'transparent',
      border: '1px solid var(--border-medium)',
      color: 'var(--icon-tertiary)',
      ...baseStyle,
    },
  }

  const hoverStyle: React.CSSProperties = {
    background: 'var(--hover-bg)',
    color: 'var(--text-primary)',
  }

  const activeStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
  }

  const combinedStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...(active ? activeStyle : {}),
    ...style,
  }

  return (
    <Button
      ref={ref}
      type="text"
      icon={icon}
      onClick={onClick}
      disabled={disabled}
      style={combinedStyle}
      {...props}
      // 使用 CSS hover 而不是 React 状态
      onMouseEnter={(e) => {
        if (!disabled && e.currentTarget) {
          Object.assign(e.currentTarget.style, hoverStyle)
        }
        props.onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        if (e.currentTarget) {
          Object.assign(e.currentTarget.style, combinedStyle)
        }
        props.onMouseLeave?.(e)
      }}
    />
  )
})

export default IconButton
