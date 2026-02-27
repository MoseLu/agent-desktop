# Sidebar 组件

侧边栏组件，支持折叠/展开状态，包含任务列表、导航操作和用户菜单。

## 文件结构

```
Sidebar/
├── index.ts                      # 导出文件
├── Sidebar.tsx                   # 主组件（协调各子组件）
├── Sidebar.types.ts              # 类型定义
├── Sidebar.styles.ts             # 样式对象
└── components/
    ├── CollapsedSidebar.tsx      # 折叠状态侧边栏
    ├── ExpandedSidebar.tsx       # 展开状态侧边栏
    ├── NavActions.tsx            # 导航按钮（新建任务、搜索）
    ├── TaskList.tsx              # 任务列表组件
    └── UserMenu.tsx              # 用户菜单（含头像）
```

## 组件职责

### Sidebar (主组件)
- 管理折叠/展开状态
- 协调子组件渲染
- 处理全局事件（点击外部关闭菜单）

### CollapsedSidebar
- 渲染折叠状态的侧边栏（宽度 48px）
- 显示 Logo、导航图标、用户头像

### ExpandedSidebar
- 渲染展开状态的侧边栏（宽度 240px）
- 显示完整的导航、任务列表、用户信息

### NavActions
- 新建任务按钮
- 搜索按钮
- 支持折叠/展开两种模式

### TaskList
- 任务列表渲染
- 任务项选择/删除
- 折叠/展开控制

### UserMenu
- 用户头像显示
- 下拉菜单（设置、联系我们、退出等）
- 支持折叠/展开两种模式

## 使用示例

```tsx
import { Sidebar } from './components/layout/Sidebar'

function App() {
  const conversations = [...]
  const settings = {...}
  
  return (
    <Sidebar
      conversations={conversations}
      activeId={activeId}
      settings={settings}
      onHome={handleHome}
      onSelect={handleSelect}
      onNewTask={handleNewTask}
      onDelete={handleDelete}
      onSettings={handleSettings}
      onSearch={handleSearch}
    />
  )
}
```

## Props 类型

详见 `Sidebar.types.ts`：

- `SidebarProps`: 主组件 Props
- `UserMenuProps`: 用户菜单 Props
- `TaskListProps`: 任务列表 Props
- `NavActionsProps`: 导航操作 Props
- `TaskItemProps`: 任务项 Props

## 样式

所有样式定义在 `Sidebar.styles.ts` 中，使用 CSS-in-JS 方案，支持设计令牌。

## 代码统计

| 文件 | 行数 | 职责 |
|------|------|------|
| Sidebar.tsx | ~35 | 主组件，状态管理 |
| Sidebar.types.ts | ~40 | 类型定义 |
| Sidebar.styles.ts | ~280 | 样式对象 |
| CollapsedSidebar.tsx | ~50 | 折叠状态渲染 |
| ExpandedSidebar.tsx | ~60 | 展开状态渲染 |
| UserMenu.tsx | ~70 | 用户菜单 |
| TaskList.tsx | ~50 | 任务列表 |
| NavActions.tsx | ~50 | 导航操作 |

**总计**: ~635 行（原文件 741 行）

## 优势

✅ **单一职责**: 每个组件只负责一个功能  
✅ **易于测试**: 小组件更容易编写单元测试  
✅ **便于复用**: UserMenu、TaskList 可在其他地方复用  
✅ **代码可读性**: 每个文件 < 300 行  
✅ **维护性**: 修改某个功能不影响其他部分  
✅ **类型安全**: 完整的 TypeScript 类型定义  
