项目已完成所需的修改，以支持浏览器和 Electron 两种开发环境：

## 修改概述
1. 创建了 `src/electron-mock.ts` 文件，提供 Electron API 的完整模拟实现
2. 更新了 `src/main.tsx` 以首先导入模拟模块
3. 确保在浏览器环境中有模拟功能，在 Electron 环境中有真实功能

## 启动步骤
### 方法一：分步启动（推荐用于调试）
1. 启动 Vite 服务器:
   ```bash
   pnpm exec vite
   ```

2. 在另一个终端窗口启动 Electron 应用:
   ```bash
   pnpm exec electron .
   ```

### 方法二：一键启动整个环境
```bash
pnpm dev
```

## 功能说明
- 在浏览器中访问 http://localhost:5173 会提供完整功能的模拟实现，适合 UI 调试
- 在 Electron 应用中运行将使用真实的 Electron API 和系统功能

## 技术实现
- 模拟模块仅在 window.electron 不存在时注入
- 使用 localStorage 持久化开发设置
- 提供了所有 Electron API 的模拟实现，避免浏览器环境中的 undefined 错误