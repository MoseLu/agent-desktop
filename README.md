# Agent Desktop

MiniMax Agent Desktop 完整复刻版，基于 **Electron + React + TypeScript + Claude API**。

## 效果对照

| 功能 | MiniMax | 本项目 |
|------|---------|--------|
| 原生 Windows 标题栏 | ✅ | ✅ |
| 浅色主题 | ✅ | ✅ |
| 左侧导航栏 | ✅ | ✅ |
| 专家/任务记录折叠 | ✅ | ✅ |
| 用户信息底部 | ✅ | ✅ |
| 居中大输入框 | ✅ | ✅ |
| Tab 补全示例 | ✅ | ✅ |
| 工作区路径显示 | ✅ | ✅ |
| 快捷任务芯片 | ✅ | ✅ |
| 专家套组卡片 | ✅ | ✅ |
| 工具调用可视化 | ✅ | ✅ |
| 本地文件操作 | ✅ | ✅ |
| Shell 命令执行 | ✅ | ✅ |

## 快速开始

### 前置条件

```bash
node -v   # >= 18
pnpm -v   # >= 8（如未安装：npm install -g pnpm）
```

### 安装与运行

```bash
# 安装依赖
pnpm install

# 开发模式（同时启动 Vite + Electron）
pnpm dev

# 打包成 .exe
pnpm build
```

### 首次配置

启动后自动弹出设置界面：

1. **API Key** — 从 [console.anthropic.com](https://console.anthropic.com/keys) 获取
2. **工作区目录** — Agent 的文件操作根目录
3. **模型** — 推荐 Claude Sonnet 4

## 项目结构

```
agent-desktop/
├── electron/
│   ├── main.js              # 主进程（原生窗口、IPC）
│   ├── preload.js           # 安全桥接
│   └── agent/
│       ├── loop.js          # Agent 执行循环
│       └── tools/index.js   # 文件系统 + Shell 工具
├── src/
│   ├── App.tsx
│   ├── types.ts             # TypeScript 类型定义
│   └── components/
│       ├── Sidebar.tsx      # 左侧导航（对标截图）
│       ├── HomePage.tsx     # 首页（标题+输入框+卡片）
│       ├── ChatPage.tsx     # 对话页+工具执行可视化
│       └── SettingsModal.tsx
├── pnpm-workspace.yaml
├── tsconfig.json
└── vite.config.ts
```

## 内置工具

| 工具 | 功能 |
|------|------|
| `list_files` | 列出目录内容 |
| `read_file` | 读取文件 |
| `write_file` | 写入/创建文件 |
| `move_file` | 移动/重命名 |
| `delete_file` | 删除文件 |
| `create_directory` | 创建目录 |
| `execute_shell` | 执行 Shell 命令 |
| `search_files` | 按名称/内容搜索 |
| `get_file_info` | 获取文件元信息 |

## 示例任务

```
整理我的工作区：把截图放到 Screenshots 文件夹，文档放到 Docs 文件夹

用 ffmpeg 把工作区里所有 mp4 视频压缩到 720p

分析我的项目代码，生成一份 markdown 格式的文档说明

每天 10:00 为我生成科技新闻摘要并保存到文件
```
