# SVG 图标使用指南

基于 `vite-plugin-svg-icons` 实现的统一 SVG 图标管理方案。

## 特性

- ✅ 自动批量导入 SVG 文件
- ✅ 统一的图标组件封装
- ✅ 支持自定义颜色、尺寸
- ✅ 性能优化（SVG Sprite）
- ✅ 类型安全

## 目录结构

```
src/asserts/svg/
├── action/          # 操作类图标
│   ├── Plus.svg
│   ├── Search.svg
│   ├── Send.svg
│   └── Attach.svg
├── navigation/      # 导航类图标
│   ├── Menu.svg
│   ├── Collapse.svg
│   └── Expand.svg
├── status/          # 状态类图标
│   ├── Check.svg
│   ├── Close.svg
│   └── Info.svg
└── system/          # 系统类图标
    ├── Logo.svg
    ├── Settings.svg
    └── User.svg
```

## 使用方法

### 1. 使用预定义的图标组件

```tsx
import { LogoIcon, PlusIcon, SearchIcon } from '@ui'

function MyComponent() {
  return (
    <div>
      {/* 基础用法 */}
      <LogoIcon size={24} />
      
      {/* 自定义颜色 */}
      <PlusIcon size={20} color="#1890ff" />
      
      {/* 继承父元素颜色 */}
      <div style={{ color: 'red' }}>
        <SearchIcon size={18} />
      </div>
    </div>
  )
}
```

### 2. 直接使用 SvgIcon 组件

```tsx
import { SvgIcon } from '@ui'

function MyComponent() {
  return (
    <div>
      {/* 指定目录和文件名 */}
      <SvgIcon name="Plus" prefix="action" size={24} />
      <SvgIcon name="Logo" prefix="system" size={32} color="#1890ff" />
      
      {/* 完整自定义 */}
      <SvgIcon
        name="Check"
        prefix="status"
        size={20}
        color="green"
        className="custom-class"
        onClick={() => console.log('clicked')}
      />
    </div>
  )
}
```

## 图标列表

### Action（操作类）
- `PlusIcon` - 加号
- `SearchIcon` - 搜索
- `SendIcon` - 发送
- `AttachIcon` - 附件
- `OmnipotentModeIcon` - 全能模式

### Navigation（导航类）
- `MenuIcon` - 菜单
- `CollapseIcon` - 折叠
- `ExpandIcon` - 展开
- `ChevronIcon` - 箭头

### Status（状态类）
- `CheckIcon` - 勾选
- `CloseIcon` - 关闭
- `InfoIcon` - 信息
- `LogoutIcon` - 退出
- `BellIcon` - 通知

### System（系统类）
- `LogoIcon` - Logo
- `GearIcon` - 齿轮
- `SettingsIcon` - 设置
- `UserIcon` - 用户
- `DesktopIcon` - 桌面
- `ContactIcon` - 联系
- `TaskIcon` - 任务
- `FolderIcon` - 文件夹
- `LightningIcon` - 闪电

## Props 说明

### IconProps (所有图标组件)

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `size` | `number \| string` | `16` | 图标大小 |
| `color` | `string` | `currentColor` | 图标颜色 |
| `className` | `string` | - | 自定义类名 |
| `style` | `CSSProperties` | - | 自定义样式 |
| `onClick` | `() => void` | - | 点击事件 |
| 其他 SVG 属性 | `SVGProps` | - | 透传给 SVG 元素 |

## 添加新图标

1. 将 SVG 文件放入对应的目录（如 `src/asserts/svg/action/MyIcon.svg`）
2. 确保 SVG 使用 `currentColor` 作为颜色
3. 在 `icons/index.tsx` 中导出新图标：

```tsx
export const MyIcon = (props: IconProps) => (
  <SvgIcon name="MyIcon" prefix="action" {...props} />
)
```

4. 在 `ui/index.ts` 中导出（可选）

## SVG 文件规范

```xml
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 使用 currentColor 以便继承颜色 -->
  <path d="..." stroke="currentColor" stroke-width="2" />
</svg>
```

**注意事项：**
- 必须有 `viewBox` 属性
- 使用 `currentColor` 而不是固定颜色
- 移除固定的 `width` 和 `height`
- 保持简洁的 SVG 结构

## 技术细节

- **插件**: `vite-plugin-svg-icons`
- **Symbol ID 格式**: `icon-[dir]-[name]`
- **注入位置**: `body-last`
- **优化**: SVGO 自动优化
