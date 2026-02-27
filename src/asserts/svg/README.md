# SVG 图标库（自动导入版）

本目录存放项目中使用的所有 SVG 图标文件，采用分类管理和自动导入机制。

## 目录结构

```
src/asserts/svg/
├── action/              # 操作类图标
│   ├── Plus.svg        # 加号
│   ├── Search.svg      # 搜索
│   ├── Send.svg        # 发送
│   └── Attach.svg      # 附件
│
├── navigation/          # 导航类图标
│   ├── Menu.svg        # 菜单
│   ├── Collapse.svg    # 折叠
│   ├── Expand.svg      # 展开
│   └── Chevron.svg     # V 形箭头
│
├── status/              # 状态类图标
│   ├── Check.svg       # 勾选
│   ├── Close.svg       # 关闭
│   ├── Info.svg        # 信息
│   ├── Logout.svg      # 退出
│   └── Bell.svg        # 铃铛
│
├── system/              # 系统类图标
│   ├── Logo.svg        # Logo
│   ├── Gear.svg        # 齿轮/设置
│   ├── Settings.svg    # 设置
│   ├── User.svg        # 用户
│   ├── Desktop.svg     # 桌面
│   ├── Contact.svg     # 联系
│   ├── Task.svg        # 任务
│   ├── Folder.svg      # 文件夹
│   ├── Lightning.svg   # 闪电
│   └── Omnipotent.svg  # 六芒星
│
└── SixStar.svg         # 六星图标（根目录）
```

## 自动导入机制

使用 `unplugin-icons` 和 `unplugin-auto-import` 实现图标的自动扫描和按需导入。

### 配置说明

**vite.config.ts**:

```typescript
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    Icons({
      svg: {
        react: true,
        customCollections: {
          'app': Icons.loadFromFs({
            dir: path.resolve(__dirname, 'src/asserts/svg'),
            ext: 'svg',
          }),
        },
      },
    }),
    AutoImport({
      resolvers: [
        IconsResolver({
          customCollections: ['app'],
        }),
      ],
      dts: 'src/auto-imports.d.ts',
    }),
  ],
})
```

## 使用方式

### ✅ 直接使用（推荐）

无需任何导入语句，直接在 JSX 中使用：

```tsx
// 不需要 import，直接使用！
function MyComponent() {
  return (
    <div>
      <PlusIcon size={20} />
      <SearchIcon color="blue" />
      <LogoIcon size={32} />
    </div>
  )
}
```

### 图标命名规则

- SVG 文件名自动转换为 PascalCase 组件名
- 例如：`Plus.svg` → `<PlusIcon />`
- 例如：`search.svg` → `<SearchIcon />`

### 支持的属性

所有图标组件支持以下属性：

```tsx
<PlusIcon
  size={20}                    // 尺寸（宽高）
  color="currentColor"         // 颜色（默认继承父元素）
  className="custom-class"     // 自定义类名
  style={{ opacity: 0.8 }}     // 自定义样式
  onClick={handleClick}        // 点击事件
  title="Plus icon"            // 标题/提示
/>
```

## 添加新图标

### 步骤

1. **创建 SVG 文件**
   ```bash
   # 在对应分类目录下创建
   src/asserts/svg/action/NewAction.svg
   ```

2. **确保 SVG 规范**
   ```svg
   <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
     <path d="..." stroke="currentColor" stroke-width="2"/>
   </svg>
   ```

3. **自动生效**
   - 重启开发服务器（`pnpm dev`）
   - 直接在组件中使用 `<NewActionIcon />`
   - TypeScript 类型会自动生成

### 分类规则

- **action/**: 用户操作相关（加号、搜索、发送、附件等）
- **navigation/**: 导航相关（菜单、折叠、展开、箭头等）
- **status/**: 状态提示相关（勾选、关闭、信息、通知等）
- **system/**: 系统功能相关（Logo、设置、用户、任务等）

## 设计原则

1. **零配置使用**：无需手动导入，自动扫描可用图标
2. **分类管理**：按功能分类，便于查找和维护
3. **按需加载**：未使用的图标会被 tree-shaking 移除
4. **类型安全**：自动生成 TypeScript 类型定义
5. **主题适配**：使用 `currentColor` 自动继承颜色

## 主题适配示例

```tsx
// 自动适配浅色/深色主题
<div style={{ color: 'var(--text-primary)' }}>
  <SettingsIcon />  {/* 显示为主题主色 */}
</div>

<div style={{ color: 'var(--text-secondary)' }}>
  <SettingsIcon />  {/* 显示为主题次级色 */}
</div>

// Hover 效果
<button 
  style={{ 
    color: 'var(--text-tertiary)',
    ':hover': { color: 'var(--text-primary)' }
  }}
>
  <GearIcon />
</button>
```

## 最佳实践

### ✅ 推荐

```tsx
// 1. 直接使用，无需导入
function MyComponent() {
  return <PlusIcon size={20} />
}

// 2. 使用语义化分类存放
// action/ 目录：用户操作
// navigation/ 目录：导航相关
// status/ 目录：状态提示
// system/ 目录：系统功能

// 3. 继承颜色（自动适配主题）
<div style={{ color: 'var(--text-primary)' }}>
  <LogoIcon />
</div>

// 4. 统一尺寸规范
<Icon size={16} />  // 小图标
<Icon size={20} />  // 标准图标
<Icon size={24} />  // 大图标
<Icon size={32} />  // 特大图标
```

### ❌ 避免

```tsx
// 1. 不要手动导入（已自动导入）
import { PlusIcon } from './xxx'  // ❌

// 2. 不要硬编码颜色（除非特殊需求）
<PlusIcon color="#000" />  // ❌ 不会随主题变化

// 3. 不要放在根目录（除非无法分类）
// 应该放在 action/, navigation/, status/, system/ 子目录
```

## 技术细节

### 自动导入原理

1. **Vite 插件扫描**：`unplugin-icons` 扫描 `src/asserts/svg` 目录
2. **虚拟模块生成**：为每个 SVG 生成 React 组件
3. **按需导入**：`unplugin-auto-import` 检测代码中的图标使用
4. **自动注入**：在编译时自动添加导入语句
5. **类型生成**：自动生成 TypeScript 类型定义文件

### 文件处理流程

```
SVG 文件 → Vite 插件扫描 → 生成 React 组件 → 
代码检测使用 → 自动注入导入 → 打包优化（tree-shaking）
```

### 性能优化

- **Tree-shaking**：未使用的图标不会被打包
- **按需编译**：只在需要时编译图标组件
- **缓存机制**：编译结果会被缓存，加快重启速度

## 常见问题

### Q: 图标不显示怎么办？

A: 
1. 检查 SVG 文件是否在正确的分类目录下
2. 确保 SVG 使用 `currentColor`
3. 重启开发服务器
4. 检查浏览器控制台是否有错误

### Q: TypeScript 报错找不到类型？

A: 
1. 确保 `src/auto-imports.d.ts` 已生成
2. 检查 `tsconfig.json` 是否包含该文件
3. 重启 TypeScript 语言服务

### Q: 如何查看可用的图标？

A: 
1. 查看 `src/asserts/svg/` 目录结构
2. 查看生成的 `src/auto-imports.d.ts` 文件
3. IDE 会自动提示可用的图标组件

### Q: 自定义图标如何命名？

A: 
- 使用大驼峰命名（PascalCase）
- 例如：`MyCustomIcon.svg`
- 使用时：`<MyCustomIcon />`

## 迁移指南

### 从手动导入迁移

**之前：**
```tsx
import { PlusIcon } from '@ui/icons'
<PlusIcon size={20} />
```

**现在：**
```tsx
// 无需导入，直接使用！
<PlusIcon size={20} />
```

### 从 icons.tsx 迁移

**之前：**
```tsx
import { PlusIcon } from './icons'
```

**现在：**
```tsx
// 无需导入，自动识别！
<PlusIcon />
```

## 配置参考

### Vite 插件选项

```typescript
Icons({
  svg: {
    react: true,              // 生成 React 组件
    customCollections: {
      'app': Icons.loadFromFs({
        dir: path.resolve(__dirname, 'src/asserts/svg'),
        ext: 'svg',
      }),
    },
  },
  defaultStyle: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

### AutoImport 选项

```typescript
AutoImport({
  resolvers: [
    IconsResolver({
      customCollections: ['app'],
      // prefix: 'Icon',  // 可选前缀
    }),
  ],
  dts: 'src/auto-imports.d.ts',  // 类型定义位置
  eslintrc: {
    enabled: true,  // ESLint 支持
  },
})
```

## 相关文件

- `vite.config.ts` - Vite 插件配置
- `src/auto-imports.d.ts` - 自动生成的类型定义
- `src/components/ui/IconButton.tsx` - 图标按钮组件
