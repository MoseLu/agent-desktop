# 环境检测工具使用指南

## 概述

本项目使用专门的环境检测工具函数来判断当前运行在 Electron 环境还是浏览器开发模式，避免直接访问 `window.electron` 导致的错误。

## API 文档

### `isElectron()`

判断是否在 Electron 渲染进程中运行。

**返回值**: `boolean`

**示例**:
```typescript
import { isElectron } from '@utils/env'

if (isElectron()) {
  // Electron 环境
  window.electron.saveSettings(settings)
} else {
  // 浏览器开发模式
  console.log('Running in browser')
}
```

### `isBrowser()`

判断是否在浏览器开发模式中运行。

**返回值**: `boolean`

**示例**:
```typescript
import { isBrowser } from '@utils/env'

if (isBrowser()) {
  // 使用模拟数据
  return mockSettings
}
```

### `callElectron(fn, defaultValue?)`

安全地调用 Electron API（异步版本）。

**参数**:
- `fn: () => Promise<T>` - 要执行的 Electron API 调用函数
- `defaultValue?: T` - 可选，如果在浏览器中运行，返回的默认值

**返回值**: `Promise<T | undefined>`

**示例**:
```typescript
import { callElectron } from '@utils/env'

// 基本使用
const settings = await callElectron(() => window.electron.getSettings())

// 带默认值
const folder = await callElectron(
  () => window.electron.pickFolder(),
  null
)

// 错误处理
const result = await callElectron(
  () => window.electron.someRiskyAPI(),
  fallbackValue
)
```

### `callElectronSync(fn, defaultValue?)`

安全地调用 Electron API（同步版本）。

**参数**:
- `fn: () => T` - 要执行的 Electron API 调用函数
- `defaultValue?: T` - 可选，如果在浏览器中运行，返回的默认值

**返回值**: `T | undefined`

**示例**:
```typescript
import { callElectronSync } from '@utils/env'

const settings = callElectronSync(
  () => window.electron.getSettingsSync(),
  defaultSettings
)
```

## 使用场景

### 1. 条件执行 Electron API

```typescript
import { isElectron } from '@utils/env'

function saveSettings(settings: Settings) {
  if (isElectron()) {
    window.electron.saveSettings(settings)
  } else {
    // 浏览器开发模式：只记录日志
    console.log('[Mock] Saving settings:', settings)
  }
}
```

### 2. 获取初始数据

```typescript
import { callElectron } from '@utils/env'

useEffect(() => {
  callElectron(
    () => window.electron.getSettings(),
    defaultSettings // 浏览器模式下的默认值
  ).then(settings => {
    setSettings(settings)
  })
}, [])
```

### 3. 用户交互功能

```typescript
import { isElectron, callElectron } from '@utils/env'

async function pickFolder() {
  if (!isElectron()) {
    alert('此功能仅在 Electron 环境中可用')
    return null
  }
  
  return await callElectron(() => window.electron.pickFolder())
}
```

## 最佳实践

### ✅ 推荐做法

1. **使用 `isElectron()` 进行环境检测**
   ```typescript
   if (isElectron()) {
     // Electron 特定逻辑
   }
   ```

2. **使用 `callElectron()` 安全调用 API**
   ```typescript
   const result = await callElectron(
     () => window.electron.someAPI(),
     defaultValue
   )
   ```

3. **提供降级方案**
   ```typescript
   const settings = isElectron()
     ? await window.electron.getSettings()
     : mockSettings
   ```

### ❌ 避免的做法

1. **直接访问 `window.electron`**
   ```typescript
   // ❌ 错误：在浏览器中会报错
   window.electron.saveSettings(settings)
   
   // ✅ 正确：先检查环境
   if (isElectron()) {
     window.electron.saveSettings(settings)
   }
   ```

2. **假设 `window.electron` 总是存在**
   ```typescript
   // ❌ 错误
   const settings = window.electron.getSettings()
   
   // ✅ 正确
   const settings = await callElectron(
     () => window.electron.getSettings(),
     defaultSettings
   )
   ```

## 原理说明

### 检测逻辑

```typescript
function isElectron(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    window.electron !== undefined
  )
}
```

- 检查 `window` 对象是否存在（排除 SSR 环境）
- 检查 `window.electron` 是否被定义（Electron preload 脚本注入）

### 安全调用

`callElectron()` 函数内部实现：
1. 检查是否在 Electron 环境中
2. 如果不是，直接返回默认值
3. 如果是，执行传入的函数
4. 捕获并记录任何错误
5. 错误时返回默认值

## 文件结构

```
src/utils/
├── env.ts              # 环境检测工具实现
├── index.ts            # 工具函数导出
├── ENV_USAGE.md        # 使用文档（本文件）
└── ...                 # 其他工具函数
```

## 导入路径

使用别名导入：
```typescript
import { isElectron, callElectron } from '@utils/env'
// 或
import { isElectron, callElectron } from '@utils'
```

## 更新日志

- **v1.0.0** (2026-02-26): 初始版本，提供基础环境检测和安全调用功能
