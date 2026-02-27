import React from 'react'
import { Tooltip as AntTooltip } from 'antd'
import type { TooltipProps as AntTooltipProps } from 'antd'

export interface TooltipProps extends Omit<AntTooltipProps, 'title' | 'placement'> {
  title: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * 基于 antd Tooltip 的封装组件
 * 
 * 特性：
 * - 使用 antd 原生的 Tooltip 组件，确保稳定性和一致性
 * - 自动适配深浅色主题
 * - 支持所有 antd Tooltip 的属性
 * 
 * @example
 * ```tsx
 * <Tooltip title="提示文本">
 *   <button>按钮</button>
 * </Tooltip>
 * 
 * // 指定位置
 * <Tooltip title="提示文本" placement="bottom">
 *   <button>按钮</button>
 * </Tooltip>
 * ```
 */
export default function Tooltip({ 
  title, 
  children, 
  position = 'bottom',
  ...props 
}: TooltipProps) {
  return (
    <AntTooltip 
      title={title} 
      placement={position}
      arrow
      {...props}
    >
      {children}
    </AntTooltip>
  )
}
