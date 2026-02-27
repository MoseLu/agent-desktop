import React, { useEffect } from 'react'

export interface SvgIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'rotated'> {
  /** 图标名称（对应 SVG 文件名） */
  name: string
  /** 图标目录（相对于 src/asserts/svg） */
  prefix?: string
  /** 图标颜色 */
  color?: string
  /** 图标大小 */
  size?: number | string
  /** 自定义类名 */
  className?: string
  /** 是否旋转 180 度 */
  rotated?: boolean
}

/**
 * SVG 图标组件
 * 
 * @example
 * ```tsx
 * // 使用 action 目录下的 Plus.svg
 * <SvgIcon name="Plus" prefix="action" size={24} />
 * 
 * // 使用 system 目录下的 Logo.svg
 * <SvgIcon name="Logo" prefix="system" size={32} color="#1890ff" />
 * 
 * // 使用 status 目录下的 Check.svg
 * <SvgIcon name="Check" prefix="status" />
 * ```
 */
export const SvgIcon: React.FC<SvgIconProps> = ({
  name,
  prefix = '',
  color,
  size = 16,
  className,
  style,
  rotated = false,
  ...props
}) => {
  // 构建 symbolId: icon-[dir]-[name]
  const symbolId = prefix ? `icon-${prefix}-${name}` : `icon-${name}`
  
  // 统一尺寸和颜色
  const mergedStyle: React.CSSProperties = {
    width: typeof size === 'number' ? size : size,
    height: typeof size === 'number' ? size : size,
    color: color || 'currentColor',
    // 应用旋转
    transform: rotated ? 'rotate(180deg)' : 'none',
    transition: 'transform 0.2s ease',
    ...style,
  }

  return (
    <svg
      className={className}
      style={mergedStyle}
      aria-hidden="true"
      {...props}
    >
      <use href={`#${symbolId}`} fill="currentColor" />
    </svg>
  )
}

export default SvgIcon
