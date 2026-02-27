# 设计令牌系统指南

## 概述

本项目采用三层设计令牌系统，确保浅色和深色主题的完整性和一致性。

## 令牌层级结构

```
Level 1: Global Tokens（全局令牌）
  ├─ 固定值（不随主题变化）：间距、圆角、字体、行高、层级等
  └─ 颜色值（随主题变化）：gray-50 到 gray-900、blue、purple 等

Level 2: Alias Tokens（语义化令牌）
  ├─ 背景色：bg-primary, bg-secondary, bg-tertiary
  ├─ 边框色：border-light, border-medium, border-dark
  ├─ 文字色：text-primary, text-secondary, text-tertiary
  ├─ 强调色：accent-primary, accent-secondary
  ├─ 功能色：success, warning, error, info
  └─ 其他：阴影、输入框、按钮、选区等

Level 3: Component Tokens（组件令牌）
  ├─ 用户菜单：user-menu-bg, user-menu-border
  ├─ 输入框组件：input-component-bg, input-component-border
  ├─ 模态框：modal-backdrop, modal-bg, modal-shadow
  └─ 工具提示：tooltip-bg, tooltip-border, tooltip-shadow
```

## 主题切换机制

### 浅色模式（默认）
```css
/* 选择器：[data-theme='light'] 或 :root:not([data-theme='dark']) */
[data-theme='light'] {
  --bg-primary: var(--color-white);      /* #ffffff */
  --text-primary: var(--color-gray-900); /* #1a1a1a */
  --border-light: var(--color-gray-200); /* #efefef */
  /* ... */
}
```

### 深色模式
```css
/* 选择器：[data-theme='dark'] */
[data-theme='dark'] {
  --bg-primary: var(--color-gray-200);   /* #1c1c1c */
  --text-primary: var(--color-gray-900); /* #e5e5e5 */
  --border-light: var(--color-gray-300); /* #333333 */
  /* ... */
}
```

## 完整令牌清单

### Level 1: Global Tokens（固定值 - 不随主题变化）

**间距尺度**
```css
--space-0: 0
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

**圆角尺度**
```css
--radius-none: 0
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
--radius-2xl: 20px
--radius-full: 9999px
```

**字体大小**
```css
--text-xs: 11px
--text-sm: 12px
--text-base: 13.5px
--text-lg: 14px
--text-xl: 16px
--text-2xl: 20px
--text-3xl: 28px
```

**字体粗细**
```css
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

**行高**
```css
--leading-none: 1
--leading-tight: 1.25
--leading-normal: 1.5
--leading-relaxed: 1.75
```

**过渡时间**
```css
--transition-fast: 0.1s
--transition-normal: 0.15s
--transition-slow: 0.2s
--transition-slower: 0.3s
```

**层级**
```css
--z-dropdown: 100
--z-sticky: 200
--z-modal-backdrop: 300
--z-modal: 400
--z-tooltip: 500
--z-toast: 600
```

### Level 1: Global Tokens（颜色值 - 随主题变化）

**灰色调色板**

| Token | 浅色模式 | 深色模式 | 用途 |
|-------|---------|---------|------|
| `--color-gray-50` | #fafafa | #2d2d2d | 最浅背景 |
| `--color-gray-100` | #f5f5f5 | #262626 | 次浅背景 |
| `--color-gray-200` | #efefef | #1c1c1c | 浅色背景/边框 |
| `--color-gray-300` | #e8e8e8 | #333333 | 浅边框 |
| `--color-gray-400` | #e0e0e0 | #404040 | 中边框 |
| `--color-gray-500` | #cccccc | #505050 | 深边框 |
| `--color-gray-600` | #999999 | #707070 | 次级文字 |
| `--color-gray-700` | #666666 | #a0a0a0 | 主要文字（深） |
| `--color-gray-800` | #333333 | #cccccc | 主要文字（中） |
| `--color-gray-900` | #1a1a1a | #e5e5e5 | 主要文字（深） |
| `--color-gray-950` | - | #171717 | 最深背景 |

**强调色**

| Token | 浅色/深色 | 用途 |
|-------|---------|------|
| `--color-blue-500` | #667eea / #7c8ffa | 主强调色 |
| `--color-blue-600` | #5568d3 / #6a7ae6 | 主强调色（深） |
| `--color-purple-500` | #764ba2 / #8b5cf6 | 次强调色 |
| `--color-purple-600` | #6a3f8f / #7c3aed | 次强调色（深） |
| `--color-green-500` | #4caf50 / #66bb6a | 成功 |
| `--color-orange-500` | #ff9800 / #ffa726 | 警告 |
| `--color-red-500` | #f44336 / #ef5350 | 错误 |
| `--color-red-600` | #e53935 / #e53935 | 错误（深） |
| `--color-blue-400` | #42a5f5 / #42a5f5 | 信息 |

### Level 2: Alias Tokens（语义化）

**背景色**
```css
--bg-primary: 主背景
--bg-secondary: 次级背景
--bg-tertiary: 第三级背景
--bg-overlay: 遮罩背景
--bg-modal: 模态框背景
```

**边框色**
```css
--border-light: 浅边框
--border-medium: 中等边框
--border-dark: 深边框
--border-focused: 聚焦边框
```

**文字色**
```css
--text-primary: 主要文字
--text-secondary: 次级文字
--text-tertiary: 第三级文字（图标、提示）
--text-disabled: 禁用文字
--text-inverse: 反色文字
--text-error: 错误文字
```

**强调色**
```css
--accent-primary: 主强调色
--accent-secondary: 次强调色
--accent-gradient: 强调渐变
```

**功能色**
```css
--success: 成功
--warning: 警告
--error: 错误
--error-strong: 强错误
--info: 信息
```

**阴影**
```css
--shadow-sm: 小阴影
--shadow-md: 中等阴影
--shadow-lg: 大阴影
--shadow-xl: 超大阴影
```

**其他**
```css
--input-bg: 输入框背景
--input-border: 输入框边框
--input-border-focused: 输入框聚焦边框
--input-placeholder: 输入框占位符

--button-primary-bg: 主按钮背景
--button-primary-text: 主按钮文字
--button-secondary-bg: 次按钮背景
--button-secondary-text: 次按钮文字
--button-secondary-border: 次按钮边框
--button-danger-bg: 危险按钮背景
--button-danger-text: 危险按钮文字

--selected-bg: 选中背景
--hover-bg: 悬停背景

--sidebar-bg: 侧边栏背景
--sidebar-border: 侧边栏边框

--icon-primary: 主图标
--icon-secondary: 次图标
--icon-tertiary: 第三级图标
--icon-disabled: 禁用图标
```

### Level 3: Component Tokens（组件特定）

**用户菜单**
```css
--user-menu-bg: 用户菜单背景
--user-menu-border: 用户菜单边框
--user-menu-shadow: 用户菜单阴影
```

**输入框组件**
```css
--input-component-bg: 输入框组件背景
--input-component-border: 输入框组件边框
--input-component-border-focused: 输入框组件聚焦边框
```

**模态框**
```css
--modal-backdrop: 模态框遮罩
--modal-bg: 模态框背景
--modal-shadow: 模态框阴影
```

**工具提示**
```css
--tooltip-bg: 工具提示背景
--tooltip-border: 工具提示边框
--tooltip-shadow: 工具提示阴影
```

## 使用规范

### ✅ 正确使用

```css
/* 使用语义化令牌 */
.button {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
}

.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-md);
}
```

### ❌ 错误使用

```css
/* 避免直接使用颜色值 */
.button {
  background: #333333; /* ❌ */
  color: #ffffff;      /* ❌ */
}

/* 应该使用令牌 */
.button {
  background: var(--button-primary-bg); /* ✅ */
  color: var(--button-primary-text);    /* ✅ */
}
```

## 主题对比表

### 浅色模式 vs 深色模式

| 元素 | 浅色模式 | 深色模式 |
|------|---------|---------|
| **主背景** | #ffffff (白) | #1c1c1c (深灰) |
| **次级背景** | #fafafa (极浅灰) | #1c1c1c (深灰) |
| **主要文字** | #1a1a1a (近黑) | #e5e5e5 (浅灰) |
| **次级文字** | #666666 (深灰) | #a0a0a0 (中灰) |
| **边框** | #e8e8e8 (浅灰) | #333333 (深灰) |
| **阴影** | rgba(0,0,0,0.1) | rgba(0,0,0,0.5) |
| **主按钮** | #1a1a1a 背景，白色文字 | 白色背景，#171717 文字 |

## 维护指南

### 添加新令牌

1. **确定层级**
   - 全局值 → Level 1 Global Tokens
   - 语义化值 → Level 2 Alias Tokens
   - 组件特定值 → Level 3 Component Tokens

2. **同时定义两种主题**
   ```css
   /* 浅色模式 */
   [data-theme='light'] {
     --new-token: #light-value;
   }
   
   /* 深色模式 */
   [data-theme='dark'] {
     --new-token: #dark-value;
   }
   ```

3. **添加注释**
   ```css
   /* 新令牌 - 用途说明 */
   --new-token: value;
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
   - 确保都有良好的视觉效果

## 检查清单

在提交设计令牌修改前，请检查：

- [ ] 所有 Level 1 固定值在 `:root` 中定义
- [ ] 所有 Level 1 颜色值在两种主题中都有定义
- [ ] 所有 Level 2 Alias Tokens 在两种主题中都有定义
- [ ] 所有 Level 3 Component Tokens 在两种主题中都有定义
- [ ] 浅色模式和深色模式的值相互对立（明暗对比）
- [ ] 文字和背景的对比度符合 WCAG 标准
- [ ] 所有注释清晰完整
- [ ] 在两种主题下都进行了视觉测试

## 总结

当前设计令牌系统已完整实现：

✅ **Level 1 Global Tokens**
  - 固定值：间距、圆角、字体、行高、层级、过渡时间
  - 颜色值：灰色调色板、强调色、功能色

✅ **Level 2 Alias Tokens**
  - 背景色、边框色、文字色、强调色、功能色
  - 阴影、输入框、按钮、选区、侧边栏、图标

✅ **Level 3 Component Tokens**
  - 用户菜单、输入框组件、模态框、工具提示

✅ **双主题支持**
  - 浅色模式：`[data-theme='light']` 或 `:root:not([data-theme='dark'])`
  - 深色模式：`[data-theme='dark']`
  - 所有令牌在两种主题中都有完整定义
