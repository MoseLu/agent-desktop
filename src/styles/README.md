# 样式系统架构

## 目录结构

```
src/styles/
├── index.css                    # 主入口文件
├── global.css                   # 全局样式
├── design-tokens/              # 设计令牌
│   ├── base.css                # Level 1: 基础全局令牌
│   ├── colors-light.css        # Level 1: 颜色值（浅色）
│   ├── colors-dark.css         # Level 1: 颜色值（深色）
│   ├── alias-light.css         # Level 2: 语义化令牌（浅色）
│   ├── alias-dark.css          # Level 2: 语义化令牌（深色）
│   └── components.css          # Level 3: 组件令牌
└── README.md                   # 本文档
```

## 设计令牌层级

### Level 1: Global Tokens（全局令牌）

**特点：**
- 最原始的 Design Token
- 分为两类：固定值 和 主题相关值

**文件：**
- `base.css` - 固定值（不随主题变化）
  - 间距：`--space-1` 到 `--space-16`
  - 圆角：`--radius-none` 到 `--radius-full`
  - 字体：`--text-xs` 到 `--text-3xl`
  - 字重：`--font-normal` 到 `--font-bold`
  - 行高：`--leading-none` 到 `--leading-relaxed`
  - 过渡：`--transition-fast` 到 `--transition-slower`
  - 层级：`--z-dropdown` 到 `--z-toast`

- `colors-light.css` / `colors-dark.css` - 颜色值（随主题变化）
  - 灰色调色板：`--color-gray-50` 到 `--color-gray-950`
  - 强调色：`--color-blue-500`, `--color-purple-500` 等
  - 功能色：`--color-green-500`, `--color-red-500` 等
  - 阴影强度：`--shadow-opacity-sm` 到 `--shadow-opacity-xl`

**使用示例：**
```css
/* ❌ 不推荐：直接使用 Level 1 令牌 */
.button {
  padding: var(--space-2);
  background: var(--color-gray-900);
}

/* ✅ 推荐：使用 Level 2 语义化令牌 */
.button {
  padding: var(--space-2);
  background: var(--button-primary-bg);
}
```

### Level 2: Alias Tokens（语义化令牌）

**特点：**
- 将 Level 1 的值映射为有意义的名称
- 表达"用途"而非"值"
- 分为浅色和深色两套

**文件：**
- `alias-light.css` - 浅色模式语义化令牌
- `alias-dark.css` - 深色模式语义化令牌

**分类：**
1. **背景色**
   - `--bg-primary`: 主背景
   - `--bg-secondary`: 次级背景
   - `--bg-tertiary`: 第三级背景
   - `--bg-overlay`: 遮罩背景
   - `--bg-modal`: 模态框背景

2. **边框色**
   - `--border-light`: 浅边框
   - `--border-medium`: 中等边框
   - `--border-dark`: 深边框
   - `--border-focused`: 聚焦边框

3. **文字色**
   - `--text-primary`: 主要文字
   - `--text-secondary`: 次级文字
   - `--text-tertiary`: 第三级文字
   - `--text-disabled`: 禁用文字
   - `--text-inverse`: 反色文字
   - `--text-error`: 错误文字

4. **强调色**
   - `--accent-primary`: 主强调色
   - `--accent-secondary`: 次强调色
   - `--accent-gradient`: 强调渐变

5. **功能色**
   - `--success`: 成功
   - `--warning`: 警告
   - `--error`: 错误
   - `--error-strong`: 强错误
   - `--info`: 信息

6. **阴影**
   - `--shadow-sm`: 小阴影
   - `--shadow-md`: 中等阴影
   - `--shadow-lg`: 大阴影
   - `--shadow-xl`: 超大阴影

7. **其他**
   - 输入框：`--input-bg`, `--input-border`
   - 按钮：`--button-primary-bg`, `--button-secondary-bg`
   - 状态：`--selected-bg`, `--hover-bg`
   - 侧边栏：`--sidebar-bg`, `--sidebar-border`
   - 图标：`--icon-primary`, `--icon-secondary`

**使用示例：**
```css
/* ✅ 推荐：使用语义化令牌 */
.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-md);
}

.input {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--text-primary);
}
```

### Level 3: Component Tokens（组件令牌）

**特点：**
- 针对特定组件的令牌
- 引用 Level 2 的值
- 在两种主题中都适用

**文件：**
- `components.css` - 组件特定令牌

**分类：**
1. **用户菜单**
   - `--user-menu-bg`
   - `--user-menu-border`
   - `--user-menu-shadow`

2. **输入框组件**
   - `--input-component-bg`
   - `--input-component-border`
   - `--input-component-border-focused`

3. **模态框**
   - `--modal-backdrop`
   - `--modal-bg`
   - `--modal-shadow`

4. **工具提示**
   - `--tooltip-bg`
   - `--tooltip-border`
   - `--tooltip-shadow`

**使用示例：**
```css
/* 用户菜单组件 */
.user-menu {
  background: var(--user-menu-bg);
  border: 1px solid var(--user-menu-border);
  box-shadow: var(--user-menu-shadow);
}

/* 模态框组件 */
.modal {
  background: var(--modal-bg);
  box-shadow: var(--modal-shadow);
}

.modal-backdrop {
  background: var(--modal-backdrop);
}
```

## 主题切换机制

### 浅色模式（默认）

```css
/* 当没有 data-theme 属性或 data-theme='light' 时 */
:root:not([data-theme='dark']) {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  /* ... */
}
```

### 深色模式

```css
/* 当 data-theme='dark' 时 */
[data-theme='dark'] {
  --bg-primary: #1c1c1c;
  --text-primary: #e5e5e5;
  /* ... */
}
```

### 切换方式

```typescript
// 在 ThemeProvider 中
function setTheme(theme: 'light' | 'dark' | 'system') {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    // system
    document.documentElement.removeAttribute('data-theme')
  }
}
```

## 使用规范

### ✅ 推荐做法

```css
/* 1. 优先使用 Level 2 语义化令牌 */
.button {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
}

/* 2. 使用 Level 3 组件令牌 */
.user-menu {
  background: var(--user-menu-bg);
}

/* 3. 只在必要时使用 Level 1 令牌 */
.custom-spacing {
  margin: var(--space-2);
  border-radius: var(--radius-md);
}
```

### ❌ 避免的做法

```css
/* 1. 避免直接使用颜色值 */
.button {
  background: #333333; /* ❌ */
}

/* 2. 避免跨层级引用 */
.button {
  background: var(--color-gray-800); /* ❌ 应该用语义化令牌 */
}

/* 3. 避免硬编码 */
.card {
  padding: 16px; /* ❌ 应该用 var(--space-4) */
}
```

## 维护指南

### 添加新令牌

1. **确定层级**
   - 全局原始值 → Level 1
   - 语义化用途 → Level 2
   - 组件特定 → Level 3

2. **同时定义两种主题**
   ```css
   /* colors-light.css */
   [data-theme='light'] {
     --new-token: #light-value;
   }
   
   /* colors-dark.css */
   [data-theme='dark'] {
     --new-token: #dark-value;
   }
   ```

3. **在 alias 文件中映射**
   ```css
   /* alias-light.css */
   --semantic-name: var(--new-token);
   ```

### 修改现有令牌

1. **检查影响范围**
   - 搜索所有使用该令牌的地方
   - 确认修改不会影响其他组件

2. **同时修改两种主题**
   - 确保浅色和深色模式都有对应的值
   - 保持对比度和可读性

3. **测试两种主题**
   - 在浅色模式下测试
   - 在深色模式下测试

## 检查清单

在提交样式修改前，请检查：

- [ ] 使用了正确的令牌层级（优先 Level 2）
- [ ] 没有直接使用颜色值
- [ ] 没有硬编码的尺寸值
- [ ] 在两种主题下都进行了测试
- [ ] 文字和背景的对比度符合 WCAG 标准

## 总结

当前样式系统已完整实现：

✅ **三层令牌系统**
  - Level 1: Global Tokens（基础值）
  - Level 2: Alias Tokens（语义化）
  - Level 3: Component Tokens（组件特定）

✅ **双主题支持**
  - 浅色模式：`colors-light.css` + `alias-light.css`
  - 深色模式：`colors-dark.css` + `alias-dark.css`

✅ **完整文档**
  - 使用规范
  - 维护指南
  - 检查清单
