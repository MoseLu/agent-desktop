# 百炼 Coding Plan 配置指南

## 概述

本项目已支持 **百炼 Coding Plan** 接入，用户只需在设置中切换模型，无需在前端输入 API Key。API Key 和接入地址在 Electron 主进程的代理配置中统一管理。

---

## 配置流程

### 第一步：获取 Coding Plan API Key

1. 访问 [百炼控制台](https://dashscope.console.aliyun.com/)
2. 创建或选择你的应用
3. 获取 API Key（格式类似 `sk-xxxxxxxxxxxxxxxx`）

### 第二步：在 Agent Desktop 中配置

1. 打开 Agent Desktop 应用
2. 点击左下角用户头像，打开 **设置**
3. 切换到 **代理配置** 标签页
4. 找到 **百炼 Coding Plan** 卡片
5. 输入 API Key
6. Base URL 已默认设置为 `https://coding.dashscope.aliyuncs.com/apps/anthropic`，无需修改
7. 点击 **保存**
8. 点击 **测试** 验证连通性

### 第三步：切换模型

1. 切换到 **通用** 标签页
2. 在 **模型** 下拉框中选择：
   - **Qwen3.5 Plus（推荐）** — 平衡性能和速度
   - **Qwen3 Coder Next（最新编程）** — 最新编程能力
   - **Qwen Turbo（快速）** — 快速响应
3. 选择后自动生效

---

## 配置说明

### 前端（用户界面）

- **模型选择**：用户只需在下拉框中选择模型
- **无需输入 API Key**：API Key 在"代理配置"中统一管理
- **自动匹配**：选择 Coding Plan 模型后，自动使用对应的 API Key 和 Base URL

### 后端（Electron 主进程）

配置存储在 `electron-store` 中，键位如下：

```javascript
{
  "proxy.qwencoding.apiKey": "你的 API Key",
  "proxy.qwencoding.baseUrl": "https://coding.dashscope.aliyuncs.com/apps/anthropic"
}
```

### Agent 执行流程

```
用户输入 → 选择 Qwen3.5 Plus 模型
  → AgentService 识别模型名包含 'qwen' 
  → 从代理配置读取 qwencoding 的 API Key
  → AgentLoop 使用 Anthropic SDK 发起请求
  → Base URL: https://coding.dashscope.aliyuncs.com/apps/anthropic
  → 返回结果
```

---

## 修改的文件

### 1. `electron/proxy/config.js`

添加了 `qwenCoding` provider 配置：

```javascript
const STORE_KEYS = {
  // ...
  qwenCoding: { apiKey: 'proxy.qwencoding.apiKey', baseUrl: 'proxy.qwencoding.baseUrl' },
  // ...
}

const DEFAULT_BASE_URLS = {
  // ...
  qwenCoding: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
  // ...
}
```

### 2. `src/components/modals/SettingsModal.tsx`

- 模型列表中添加 **百炼 Coding Plan** 分组
- 代理配置页面添加 **百炼 Coding Plan** provider

### 3. `electron/agent/service.js`

更新 provider 识别逻辑，支持 `coding` 关键字匹配：

```javascript
if (m.includes('coding')) {
  apiKey = proxyCfg.get('qwenCoding')?.apiKey || ''
} else if (m.includes('qwen') || m.includes('qwq')) {
  apiKey = proxyCfg.get('qwen')?.apiKey || ''
}
```

### 4. `electron/agent/loop.js`

更新注释说明，明确 Coding Plan 配置方式。

---

## 与其他 Provider 的对比

| Provider | Base URL | 模型示例 | 配置位置 |
|----------|----------|----------|----------|
| **百炼 Coding Plan** | `https://coding.dashscope.aliyuncs.com/apps/anthropic` | `qwen3.5-plus`, `qwen3-coder-next` | 代理配置 → 百炼 Coding Plan |
| MiniMax | `https://api.minimaxi.com` | `MiniMax-M2.5` | 代理配置 → MiniMax |
| 通义千问 | `https://dashscope.aliyuncs.com` | `qwen-plus`, `qwen-max` | 代理配置 → 通义千问 Qwen |
| Anthropic | `https://api.anthropic.com` | `claude-sonnet-4-20250514` | 代理配置 → Anthropic Claude |

---

## 常见问题

### Q: 为什么选择 Coding Plan 而不是直接 API？

**A**: Coding Plan 是阿里云百炼提供的专属接入点，针对编程场景优化，提供：
- 更好的代码理解能力
- 更低的延迟
- 更优惠的价格

### Q: 可以同時配置多个 Provider 吗？

**A**: 可以。你可以在代理配置中为多个 Provider 设置 API Key，然后在模型选择中切换使用。

### Q: 如何验证配置是否成功？

**A**: 在代理配置页面，点击 **测试** 按钮。如果显示 `✅ 百炼 Coding Plan 连接成功`，说明配置正确。

### Q: 模型选择后不生效怎么办？

**A**: 
1. 确认已在代理配置中设置了对应的 API Key
2. 确认模型名称与 provider 匹配（Coding Plan 模型使用 qwencoding 配置）
3. 重启应用后重试

---

## 参考资料

- [百炼 Coding Plan 官方文档](https://help.aliyun.com/zh/model-studio/developer-reference/claude-code)
- [Anthropic Claude 接入指南](https://docs.anthropic.com/zh-CN/docs/claudesdk)

---

**最后更新**: 2026-02-28  
**维护者**: Agent Desktop Team
