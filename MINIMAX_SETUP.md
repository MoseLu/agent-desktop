# MiniMax CodingPlan 配置指南

本项目已支持使用 **MiniMax CodingPlan** 作为 AI 后端，完全兼容 Anthropic/Claude 风格的接口。

## 快速开始

### 1. 获取 MiniMax API Key

1. 访问 [MiniMax 开放平台](https://platform.minimaxi.com/)
2. 订阅 CodingPlan 套餐（Starter/Plus/Max）
3. 前往 [接口密钥管理](https://platform.minimaxi.com/user-center/basic-information/interface-key)
4. 创建 **Coding Plan Key**（注意：与普通 API Key 不互通）

### 2. 在设置中配置

打开应用设置，填写以下信息：

- **API Key**: 你的 MiniMax CodingPlan API Key
- **模型**: `MiniMax-M2.5`

### 3. 开始使用

配置完成后，即可像使用 Claude 一样使用 MiniMax-M2.5 模型！

---

## 技术实现

### API 配置

```javascript
{
  apiKey: '你的 MiniMax API Key',
  baseURL: 'https://api.minimaxi.com/anthropic',
  model: 'MiniMax-M2.5'
}
```

### 兼容性说明

MiniMax 提供 **Anthropic 兼容接口**，这意味着：

- ✅ 使用与 Claude 相同的 SDK (`@anthropic-ai/sdk`)
- ✅ 相同的 API 调用格式（`messages.create`）
- ✅ 相同的工具调用（Tool Use）协议
- ✅ 相同的流式响应格式

### 环境变量（可选）

如果需要通过环境变量配置：

```bash
export ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
export ANTHROPIC_AUTH_TOKEN=你的 MiniMax API Key
export ANTHROPIC_MODEL=MiniMax-M2.5
```

---

## 订阅方案

| 套餐 | 价格 | 用量 | 适用场景 |
|------|------|------|---------|
| Starter | ¥29/月 | 40 prompts/每 5 小时 | 入门级开发 |
| Plus | ¥49/月 | 100 prompts/每 5 小时 | 专业开发 |
| Max | ¥119/月 | 300 prompts/每 5 小时 | 复杂任务 |

所有套餐均支持 **MiniMax-M2.5** 模型。

---

## 常见问题

### Q: API Key 无效？

A: 确保你创建的是 **CodingPlan Key**，而不是普通按量付费的 API Key。两种 Key 不互通。

### Q: 响应中包含 `thinking` 字段？

A: 这是 MiniMax-M2.5 的思考过程，属于正常现象。应用会自动处理并显示最终的 `text` 内容。

### Q: 可以使用其他 MiniMax 模型吗？

A: 目前推荐使用的是 `MiniMax-M2.5`，这是专为编程优化的模型。其他模型可能需要额外配置。

### Q: 与 Claude 相比如何？

A: MiniMax-M2.5 在代码生成和理解方面表现出色，且价格更具优势。适合作为 Claude 的替代方案。

---

## 参考文档

- [MiniMax CodingPlan 官方文档](https://platform.minimaxi.com/docs/coding-plan/intro)
- [快速入门指南](https://platform.minimaxi.com/docs/coding-plan/quickstart)
- [在 Claude Code 中使用 MiniMax](https://platform.minimaxi.com/docs/coding-plan/claude-code)

---

## 测试脚本

项目包含测试脚本，可用于验证 API 配置：

```bash
# 测试 Anthropic 兼容接口
node test-minimax-anthropic.js
```

如果测试成功，会看到类似输出：

```
✅ MiniMax Anthropic 接口测试通过！

🤖 AI 回复:
你好！我是助手，是一个 AI 助手，可以帮助你回答问题、提供信息和完成各种任务。很高兴认识你！
```
