# Agent Desktop - CLAUDE.md

> 三层记忆架构 - Layer 1: 项目引导层

## 📋 项目概览

**Agent Desktop** 是一个基于 Electron 的桌面 AI 助手应用，支持多模型（MiniMax、Qwen、Claude）和本地文件/Shell 操作。

### 技术栈
- **框架**: Electron 33 + React 18 + TypeScript 5.7 + Vite 6
- **UI**: Ant Design 6.x
- **AI SDK**: @anthropic-ai/sdk (兼容 MiniMax/Qwen/Claude)
- **包管理**: pnpm 9.6+

### 核心架构
```
┌─────────────────────────────────────────┐
│  Renderer (React + TypeScript)          │
│  - src/components/                      │
│  - src/utils/                           │
└─────────────────────────────────────────┘
              ↕ IPC (preload.js)
┌─────────────────────────────────────────┐
│  Main Process (Electron)                │
│  - electron/main.js                     │
│  - electron/agent/loop.js               │
│  - electron/agent/tools/                │
└─────────────────────────────────────────┘
```

## 🎯 开发规范

### 代码风格
- **命名**: PascalCase (组件), camelCase (工具函数), kebab-case (文件/目录)
- **类型**: 严格 TypeScript，禁止使用 `any`
- **导入**: 使用路径别名 (`@components/`, `@utils/`, `@types`)
- **注释**: 仅解释非显而易见的意图，避免冗余注释

### 关键约束
- ✅ 所有 API Key 存储在 electron-store（本地加密）
- ✅ 工作目录约束：Agent 文件操作限制在配置的 workspace 内
- ✅ 上下文隔离：Electron contextIsolation 必须启用
- ❌ 禁止 nodeIntegration
- ❌ 禁止硬编码 API Key

### 测试与验证
```bash
# 类型检查
pnpm typecheck

# Lint 检查
pnpm lint

# 开发模式
pnpm dev

# 生产构建
pnpm build
```

## 📁 关键文件

| 文件 | 用途 |
|------|------|
| `electron/agent/loop.js` | Agent 执行循环，支持多模型 |
| `electron/agent/tools/index.js` | 8 个内置工具定义 |
| `src/components/modals/SettingsModal.tsx` | 设置面板 |
| `src/components/pages/ChatPage.tsx` | 聊天页面 |
| `src/utils/chatApi.ts` | Chat API 封装 |
| `src/electron-mock.ts` | 浏览器 Mock |

## 🧠 三层记忆架构

本项目采用三层记忆系统：

- **Layer 1 (CLAUDE.md)**: 项目引导配置（本文件）
- **Layer 2 (SKILL.md)**: 领域知识技能（见 `skills/` 目录）
- **Layer 3 (Working Memory)**: 当前会话上下文（自动管理）

## 🚀 快速开始

1. **安装依赖**: `pnpm install`
2. **配置 API Key**: 在设置面板中填写 MiniMax/Qwen API Key
3. **启动开发**: `pnpm dev`
4. **选择模型**: 在设置中选择 `MiniMax-M2.5` 或 `qwen3-coder-next`

## ⚠️ 注意事项

- Electron 环境：使用真实 API 调用
- 浏览器环境：使用 Mock + 本地代理服务器
- API Key 安全：永不过滤到 Git
- 工作目录：始终相对于配置的 workspace

---

**最后更新**: 2026-02-28  
**维护者**: Agent Desktop Team
