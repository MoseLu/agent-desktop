# 组件目录结构

## 📁 完整项目结构

```
src/
├── components/              # 组件目录
│   ├── layout/             # 布局组件
│   │   ├── Sidebar.tsx     # 侧边栏
│   │   └── index.ts
│   │
│   ├── modals/             # 模态框/对话框
│   │   ├── SettingsModal.tsx  # 设置对话框
│   │   ├── SearchModal.tsx    # 搜索对话框
│   │   └── index.ts
│   │
│   ├── pages/              # 页面组件
│   │   ├── HomePage.tsx    # 首页
│   │   ├── ChatPage.tsx    # 聊天页面
│   │   └── index.ts
│   │
│   ├── ui/                 # 基础 UI 组件
│   │   └── index.ts        # (待添加 Button, Input 等)
│   │
│   └── README.md           # 组件文档
│
├── contexts/                # React Context（全局状态）
│   ├── ThemeProvider.tsx   # 主题提供者
│   └── index.ts
│
├── types/                   # TypeScript 类型定义
├── utils/                   # 工具函数
└── hooks/                   # 自定义 Hooks
```

## 📊 组件分类统计

| 分类 | 数量 | 组件列表 |
|------|------|----------|
| **layout/** | 1 | `Sidebar` |
| **modals/** | 2 | `SettingsModal`, `SearchModal` |
| **pages/** | 2 | `HomePage`, `ChatPage` |
| **ui/** | 0 | (待添加) |
| **contexts/** | 1 | `ThemeProvider` |
| **总计** | 6 | - |

## 🎯 分类标准

### layout/ - 布局组件

**用途**: 应用的整体布局结构

**特点**:
- 定义应用的框架结构
- 通常包含导航、侧边栏、页脚等
- 在每个页面中都会出现
- 决定页面的整体布局

**当前组件**:
- `Sidebar` - 侧边栏（导航、任务列表、用户信息）

**未来可扩展**:
- `Header` - 顶部导航栏
- `Footer` - 页脚
- `Layout` - 通用布局容器
- `NavBar` - 导航栏
- `Aside` - 侧边栏（通用）

### modals/ - 模态框/对话框

**用途**: 对话框、模态框、弹出层

**特点**:
- 覆盖在主内容之上的临时视图
- 需要用户交互或提供额外信息
- 可以打开/关闭
- 通常是全局可访问的

**当前组件**:
- `SettingsModal` - 设置对话框
- `SearchModal` - 搜索对话框

**未来可扩展**:
- `ConfirmModal` - 确认对话框
- `AlertModal` - 警告提示框
- `FormModal` - 表单对话框
- `ImagePreview` - 图片预览
- `Dropdown` - 下拉菜单
- `Popover` - 弹出框
- `Tooltip` - 工具提示

### pages/ - 页面组件

**用途**: 应用的主要页面/视图

**特点**:
- 对应路由或主要功能模块
- 包含完整的业务逻辑
- 由多个 layout、modals、ui 组件组合而成
- 每个页面对应一个独立的功能

**当前组件**:
- `HomePage` - 首页（任务输入界面）
- `ChatPage` - 聊天页面（任务执行界面）

**未来可扩展**:
- `HistoryPage` - 历史记录页面
- `SettingsPage` - 完整设置页面
- `ProfilePage` - 个人资料页面
- `DashboardPage` - 仪表板页面
- `NotFoundPage` - 404 页面

### ui/ - 基础 UI 组件

**用途**: 可复用的基础 UI 元素

**特点**:
- 最基础的构建块
- 无业务逻辑
- 高度可复用
- 通常是无状态组件

**当前组件**: (待添加)

**规划中**:
- `Button` - 按钮
- `Input` - 输入框
- `Select` - 选择框
- `Checkbox` - 复选框
- `Radio` - 单选框
- `Switch` - 开关
- `Card` - 卡片
- `Avatar` - 头像
- `Badge` - 徽章
- `Progress` - 进度条
- `Spinner` - 加载动画
- `Divider` - 分割线

### contexts/ - React Context

**用途**: 全局状态管理

**特点**:
- 提供跨组件的状态共享
- 不是 UI 组件
- 通常与 Provider 模式一起使用
- 通过 Hook 消费状态

**当前组件**:
- `ThemeProvider` - 主题管理（light/dark/system）

**未来可扩展**:
- `AuthProvider` - 认证状态
- `UserProvider` - 用户信息
- `ConfigProvider` - 应用配置
- `NotificationProvider` - 通知管理

## 📝 使用示例

### 导入布局组件

```typescript
// 方式 1: 直接导入
import Sidebar from './components/layout/Sidebar'

// 方式 2: 使用索引文件
import { Sidebar } from './components/layout'
```

### 导入模态框组件

```typescript
// 方式 1: 直接导入
import SettingsModal from './components/modals/SettingsModal'
import SearchModal from './components/modals/SearchModal'

// 方式 2: 使用索引文件
import { SettingsModal, SearchModal } from './components/modals'
```

### 导入页面组件

```typescript
// 方式 1: 直接导入
import HomePage from './components/pages/HomePage'
import ChatPage from './components/pages/ChatPage'

// 方式 2: 使用索引文件
import { HomePage, ChatPage } from './components/pages'
```

### 导入 Context

```typescript
// 导入 Provider
import { ThemeProvider } from './contexts'

// 导入 Hook
import { useTheme } from './contexts'

// 使用示例
function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <AppContent />
    </ThemeProvider>
  )
}

function Component() {
  const { theme, setTheme } = useTheme()
  // ...
}
```

## 🔧 添加新组件指南

### Step 1: 判断组件类型

问自己几个问题：

1. **这是一个布局元素吗？**（侧边栏、头部、页脚）
   - 是 → `layout/`

2. **这是一个对话框/弹出层吗？**
   - 是 → `modals/`

3. **这是一个完整的页面吗？**
   - 是 → `pages/`

4. **这是一个基础 UI 元素吗？**（按钮、输入框）
   - 是 → `ui/`

5. **这是一个全局状态管理吗？**（主题、认证）
   - 是 → `contexts/`（不在 components 内）

### Step 2: 创建组件文件

```typescript
// 示例：ui/Button.tsx
import React from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'small' | 'medium' | 'large'
  onClick?: () => void
  children: React.ReactNode
}

export default function Button({ 
  variant = 'primary', 
  size = 'medium', 
  onClick, 
  children 
}: ButtonProps) {
  return (
    <button 
      style={styles[variant]}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  primary: { /* ... */ },
  secondary: { /* ... */ },
  outline: { /* ... */ },
}
```

### Step 3: 更新索引文件

```typescript
// ui/index.ts
export { default as Button } from './Button'
```

## 🎨 最佳实践

### 1. 组件职责单一

每个组件只负责一个功能：

```typescript
// ✅ 好的做法
export default function SearchModal() { /* 只处理搜索 */ }

// ❌ 不好的做法
export default function SearchAndSettingsAndUserModal() { /* 做太多事 */ }
```

### 2. 使用 TypeScript 接口

```typescript
// ✅ 清晰的接口定义
interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}

// ❌ 模糊的 any 类型
interface Props {
  data: any
  onClick: any
}
```

### 3. 样式隔离

使用局部样式，避免全局污染：

```typescript
// ✅ 使用内联样式
const styles: Record<string, React.CSSProperties> = {
  container: { /* ... */ }
}

<div style={styles.container} />
```

### 4. 添加 JSDoc 注释

```typescript
/**
 * 搜索模态框组件
 * 
 * 用于搜索会话标题和内容，支持模糊匹配
 * 
 * @example
 * ```tsx
 * <SearchModal
 *   conversations={conversations}
 *   activeId={activeId}
 *   onSelect={handleSelect}
 *   onClose={handleClose}
 * />
 * ```
 */
export default function SearchModal({ ... }: Props) {
  // ...
}
```

## 📋 组件开发优先级

### P0 - 当前已有
- [x] `Sidebar` - 侧边栏
- [x] `SettingsModal` - 设置对话框
- [x] `SearchModal` - 搜索对话框
- [x] `HomePage` - 首页
- [x] `ChatPage` - 聊天页面
- [x] `ThemeProvider` - 主题管理

### P1 - 近期需要
- [ ] `Button` - 按钮组件
- [ ] `Input` - 输入框组件
- [ ] `Loading` - 加载组件
- [ ] `ConfirmModal` - 确认对话框

### P2 - 中期规划
- [ ] `Card` - 卡片组件
- [ ] `Avatar` - 头像组件
- [ ] `Badge` - 徽章组件
- [ ] `HistoryPage` - 历史记录

### P3 - 长期规划
- [ ] 完整的 UI 组件库
- [ ] 主题系统增强
- [ ] 动画组件
- [ ] 图表组件

## 🔍 常见问题

### Q: layout/ 和 pages/ 有什么区别？

**A**: 
- `layout/` 是**可复用的布局元素**（如 Sidebar 在每个页面都出现）
- `pages/` 是**完整的页面视图**（如 HomePage 只在首页显示）

### Q: 什么时候应该创建新的分类目录？

**A**: 当某个类别的组件超过 5-10 个，或者有明显的功能分组时：

```
components/
├── ui/           # 基础 UI（超过 10 个）
│   ├── buttons/  # 进一步细分
│   ├── inputs/
│   └── feedback/
├── layout/       # 布局（少于 5 个，保持扁平）
└── modals/       # 模态框（少于 5 个，保持扁平）
```

### Q: contexts/ 为什么不在 components/ 内？

**A**: 
- **职责不同**: Context 是状态管理，不是 UI 组件
- **使用方式不同**: Context 用于包裹和提供状态，不直接渲染
- **React 惯例**: 标准项目结构通常将 contexts 作为独立目录

### Q: 为什么不拆分 composables/ 或 hooks/？

**A**: 
当前项目**暂未拆分** hooks/composables 目录，原因如下：

1. **复用需求低**: 当前 52 个函数中只有 4 个（7.7%）可能跨组件复用
2. **组件规模适中**: 最大组件 709 行，未超过 1000 行阈值
3. **业务逻辑耦合**: 大部分函数与特定组件紧密耦合，无法独立提取
4. **React 惯例**: React 项目应使用 `hooks/` 而非 `composables/`（Vue 术语）

**何时会创建 hooks/ 目录？**

当满足以下**至少 2 个条件**时：
- [ ] 有函数在**3 个以上**组件中被需要
- [ ] 某个组件超过**1000 行**
- [ ] 团队明确提出复用需求
- [ ] 出现复杂的表单/数据获取逻辑

**当前计划**:
- 短期（现在）: 保持现状，不拆分
- 中期（3-6 个月）: 根据实际发展评估
- 长期: 如项目复杂度提升，再创建 `src/hooks/`

详细评估报告参考：`/COMPOSABLES_EVALUATION.md`

---

**最后更新**: 2026-02-26  
**维护者**: Agent Desktop Team
