// 图标组件 - 使用 vite-plugin-svg-icons
import type { SVGProps } from 'react'
import SvgIcon from '../SvgIcon'

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** 图标大小 */
  size?: number | string
}

// 导出所有图标组件（使用统一的 SvgIcon，默认尺寸 16px）
const DEFAULT_ICON_SIZE = 16

export const LogoIcon = (props: IconProps) => <SvgIcon name="Logo" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
export const SunIcon = (props: IconProps) => <SvgIcon name="Sun" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
export const MoonIcon = (props: IconProps) => <SvgIcon name="Moon" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
export const PlusIcon = (props: IconProps) => <SvgIcon name="Plus" prefix="action" size={DEFAULT_ICON_SIZE} {...props} />
export const SlidersIcon = (props: IconProps) => <SvgIcon name="Sliders" prefix="action" size={DEFAULT_ICON_SIZE} {...props} />
export const SearchIcon = (props: IconProps) => <SvgIcon name="Search" prefix="action" size={DEFAULT_ICON_SIZE} {...props} />
export const SendIcon = (props: IconProps) => <SvgIcon name="Send" prefix="action" size={DEFAULT_ICON_SIZE} {...props} />
export const AttachIcon = (props: IconProps) => <SvgIcon name="Attach" prefix="action" size={DEFAULT_ICON_SIZE} {...props} />
export const OmnipotentModeIcon = (props: IconProps) => <SvgIcon name="OmnipotentMode" prefix="action" size={DEFAULT_ICON_SIZE} {...props} />
export const MenuIcon = (props: IconProps) => <SvgIcon name="Menu" prefix="navigation" size={DEFAULT_ICON_SIZE} {...props} />
export const CollapseIcon = (props: IconProps) => <SvgIcon name="Collapse" prefix="navigation" size={DEFAULT_ICON_SIZE} {...props} />
export const ExpandIcon = (props: IconProps) => <SvgIcon name="Expand" prefix="navigation" size={DEFAULT_ICON_SIZE} {...props} />
export const ChevronIcon = (props: IconProps) => <SvgIcon name="Chevron" prefix="navigation" size={DEFAULT_ICON_SIZE} {...props} />
export const CheckIcon = (props: IconProps) => <SvgIcon name="Check" prefix="status" size={DEFAULT_ICON_SIZE} {...props} />
export const CloseIcon = (props: IconProps) => <SvgIcon name="Close" prefix="status" size={DEFAULT_ICON_SIZE} {...props} />
export const InfoIcon = (props: IconProps) => <SvgIcon name="Info" prefix="status" size={DEFAULT_ICON_SIZE} {...props} />
export const LogoutIcon = (props: IconProps) => <SvgIcon name="Logout" prefix="status" size={DEFAULT_ICON_SIZE} {...props} />
export const BellIcon = (props: IconProps) => <SvgIcon name="Bell" prefix="status" size={DEFAULT_ICON_SIZE} {...props} />
export const AlarmCheckIcon = (props: IconProps) => <SvgIcon name="AlarmCheck" prefix="status" size={DEFAULT_ICON_SIZE} {...props} />
export const ClipboardCheckIcon = (props: IconProps) => <SvgIcon name="ClipboardCheck" prefix="action" size={DEFAULT_ICON_SIZE} {...props} />
export const BroadcastIcon = (props: IconProps) => <SvgIcon name="Broadcast" prefix="action" size={DEFAULT_ICON_SIZE} {...props} />
export const PresentationIcon = (props: IconProps) => <SvgIcon name="Presentation" prefix="action" size={DEFAULT_ICON_SIZE} {...props} />
export const GearIcon = (props: IconProps) => <SvgIcon name="Gear" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
export const SettingsIcon = (props: IconProps) => <SvgIcon name="Settings" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
export const UserIcon = (props: IconProps) => <SvgIcon name="User" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
export const DesktopIcon = (props: IconProps) => <SvgIcon name="Desktop" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
export const ContactIcon = (props: IconProps) => <SvgIcon name="Contact" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
export const TaskIcon = (props: IconProps) => <SvgIcon name="Task" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
export const FolderIcon = (props: IconProps) => <SvgIcon name="Folder" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
export const LightningIcon = (props: IconProps) => <SvgIcon name="Lightning" prefix="system" size={DEFAULT_ICON_SIZE} {...props} />
