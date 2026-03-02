# Agent Desktop Skills - SKILL.md

> 三层记忆架构 - Layer 2: 永久知识层

本文件包含项目核心知识的精炼总结，用于扩展 AI 助手的能力边界。

---

## 📚 技能目录

1. [Electron 安全最佳实践](#electron-安全最佳实践)
2. [多模型 API 集成](#多模型-api-集成)
3. [TypeScript 类型安全](#typescript-类型安全)
4. [React 性能优化](#react-性能优化)
5. [代码质量规范](#代码质量规范)

---

## Electron 安全最佳实践

### ✅ 必须遵守

```javascript
// main.js - 安全配置
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,  // ✅ 必须启用
    nodeIntegration: false,  // ✅ 必须禁用
    preload: path.join(__dirname, 'preload.js'),
  },
})
```

### ❌ 严格禁止

```javascript
// ❌ 错误示例
webPreferences: {
  contextIsolation: false,  // ❌ 安全漏洞
  nodeIntegration: true,    // ❌ 允许渲染进程访问 Node.js
}
```

### IPC 通信模式

```javascript
// preload.js - 安全桥接
contextBridge.exposeInMainWorld('electron', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  // 仅暴露必要的方法，不直接暴露 ipcRenderer
})
```

---

## 多模型 API 集成

### MiniMax (Anthropic 兼容)

```javascript
const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({
  apiKey: MINI_MAX_API_KEY,
  baseURL: 'https://api.minimaxi.com/anthropic',  // ✅ MiniMax 专用端点
})

const response = await client.messages.create({
  model: 'MiniMax-M2.5',
  max_tokens: 8096,
  messages: [{ role: 'user', content: '你好' }],
})
```

### Qwen (OpenAI 兼容)

```javascript
const response = await fetch(
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QWEN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen3-coder-next',
      messages: [{ role: 'user', content: '你好' }],
      max_tokens: 8096,
    }),
  }
)
```

### 模型选择策略

| 任务类型 | 推荐模型 | 备选模型 |
|---------|---------|---------|
| 代码生成 | qwen3-coder-next | MiniMax-M2.5 |
| 通用对话 | MiniMax-M2.5 | qwen-plus |
| 复杂推理 | qwen-max | MiniMax-M2.5 |
| 快速响应 | qwen-turbo | MiniMax-Text-01 |

---

## TypeScript 类型安全

### ❌ 禁止使用 any

```typescript
// ❌ 错误
function getData(id: string): any {
  // ...
}

// ✅ 正确
interface DataResult {
  id: string
  content: string
  timestamp: Date
}

function getData(id: string): DataResult {
  // ...
}
```

### 类型推断优化

```typescript
// ✅ 使用类型别名
type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

// ✅ 使用接口继承
interface ToolEvent extends BaseEvent {
  type: 'tool_start' | 'tool_result'
  name: string
  input: Record<string, unknown>
}
```

### 类型断言最佳实践

```typescript
// ❌ 避免
const data = response as any

// ✅ 推荐
interface ResponseData {
  choices?: Array<{ message?: { content?: string } }>
}

const data = await response.json() as ResponseData
```

---

## React 性能优化

### 避免不必要的重渲染

```typescript
// ✅ 使用 useMemo 缓存计算结果
const filteredList = useMemo(() => {
  return list.filter(item => item.active)
}, [list])

// ✅ 使用 useCallback 缓存函数
const handleClick = useCallback(() => {
  // ...
}, [dependencies])
```

### 条件渲染优化

```typescript
// ✅ 使用三元运算符而非 && (避免 0 渲染)
{count > 0 ? <span>{count}</span> : null}

// ❌ 可能导致渲染 0
{count && <span>{count}</span>}
```

### 列表渲染 key 选择

```typescript
// ✅ 使用稳定唯一 ID
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}

// ❌ 避免使用索引
{items.map((item, index) => (
  <div key={index}>{item.name}</div>  // ❌ 列表变化时会出错
))}
```

---

## 代码质量规范

### ESLint 规则

```javascript
// eslint.config.js 核心规则
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',      // 禁止 any
    '@typescript-eslint/no-unused-vars': ['error', {   // 未使用变量
      argsIgnorePattern: '^_'
    }],
    'react-hooks/exhaustive-deps': 'warn',             // Hooks 依赖
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  }
}
```

### 代码审查清单

- [ ] 无 `any` 类型
- [ ] 无未使用导入/变量
- [ ] 所有函数有类型注解
- [ ] 错误处理完整
- [ ] 无硬编码配置
- [ ] 遵循命名规范
- [ ] 注释解释"为什么"而非"做什么"

### Git 提交规范

```bash
# 格式：<type>(<scope>): <description>
git commit -m "refactor: 优化类型定义，替换 any 为明确类型"
git commit -m "feat: 添加 MiniMax 模型支持"
git commit -m "fix: 修复 IPC 通信类型错误"
git commit -m "docs: 更新 CLAUDE.md 配置文档"
```

**类型说明**:
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 代码重构（不改变行为）
- `docs`: 文档更新
- `style`: 代码格式（不影响逻辑）
- `test`: 测试相关

---

## 常见问题解决方案

### Q: Electron 打包后白屏

**A**: 检查 Vite 构建配置
```typescript
// vite.config.ts
export default defineConfig({
  base: './',  // ✅ 相对路径
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
```

### Q: IPC 调用失败

**A**: 确认 preload.js 正确暴露
```javascript
// preload.js
contextBridge.exposeInMainWorld('electron', {
  // ✅ 确保方法存在
  getSettings: () => ipcRenderer.invoke('get-settings'),
})

// 渲染进程
const settings = await window.electron.getSettings()
```

### Q: TypeScript 类型错误

**A**: 检查类型定义一致性
```typescript
// types.ts - 统一定义
export interface Settings {
  apiKey: string
  workspace: string
  // ...
}

// 所有文件使用同一类型
import type { Settings } from '@types'
```

---

## 性能基准

| 指标 | 目标值 | 当前值 |
|------|-------|-------|
| 首屏加载 | < 2s | ✅ 1.2s |
| IPC 延迟 | < 50ms | ✅ 23ms |
| 类型检查 | < 10s | ✅ 6.8s |
| Bundle 大小 | < 5MB | ✅ 3.2MB |

---

**维护说明**:
- 本文件应缓慢增长，仅添加关键概念
- 每季度审查一次，移除过时内容
- 新增技能需经过团队评审
- 保持与 CLAUDE.md 的引用关系

**最后更新**: 2026-02-28  
**知识来源**: 项目实践 + 官方文档 + 社区最佳实践
