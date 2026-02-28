const Anthropic = require('@anthropic-ai/sdk')
const { TOOL_DEFINITIONS, ToolExecutor } = require('./tools/index')

const SYSTEM_PROMPT = `你是一个强大的桌面 AI 助手，直接运行在用户的电脑上，拥有本地文件系统和 shell 的完整访问权限。

## 你的能力
- **文件管理**：读写、移动、删除、整理文件和目录
- **Shell 执行**：运行任意 shell 命令，调用本地工具（ffmpeg、git、npm、python 等）
- **代码生成**：用任意语言编写并执行代码
- **任务自动化**：链式调用多个工具完成复杂工作流

## 工作方式
- 先观察环境，再动手执行
- 分步规划，逐步执行
- 出错时诊断问题并重试
- 破坏性操作前先向用户确认
- 任务完成后给出清晰的执行摘要

当前运行平台：${process.platform}`

// ─── AgentLoop：通过环境变量统一配置，使用 Anthropic SDK ─────────────────────
//
// 配置方式（与 Coding Plan / MiniMax 一致）：
//   ANTHROPIC_AUTH_TOKEN  — API Key（必填）
//   ANTHROPIC_BASE_URL    — 自定义接入点，例如：
//                           百炼 Coding Plan: https://coding.dashscope.aliyuncs.com/apps/anthropic
//                           MiniMax:          https://api.minimaxi.com/anthropic
//                           Anthropic:        https://api.anthropic.com
//   ANTHROPIC_MODEL       — 默认模型（可被 settings 中的 model 字段覆盖）
//
// 前端配置说明：
//   - 用户在前端只需切换模型，无需输入 API Key
//   - API Key 和 Base URL 在 Electron 主进程的代理配置中统一管理
//   - 根据模型名自动选择对应 provider 的配置

class AgentLoop {
  constructor({ apiKey, model, workspace, maxSteps, onEvent }) {
    this.model     = model
    this.workspace = workspace
    this.maxSteps  = maxSteps
    this.onEvent   = onEvent
    this.executor  = new ToolExecutor(workspace)
    this.stopped   = false
    this.step      = 0

    // API Key 优先使用传入的值，其次读取环境变量
    const resolvedKey = apiKey || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || ''
    // Base URL 从环境变量读取（可选）
    const baseURL = process.env.ANTHROPIC_BASE_URL

    this.client = new Anthropic({
      apiKey: resolvedKey,
      ...(baseURL && { baseURL }),
    })
  }

  stop() { this.stopped = true; this.onEvent({ type: 'stopped' }) }
  emit(type, data = {}) { this.onEvent({ type, ...data }) }

  async run(userMessages) {
    return this.runAnthropic(userMessages)
  }

  // ─── Anthropic 兼容循环（支持 Claude / MiniMax / Qwen Coding Plan 等）────────

  async runAnthropic(userMessages) {
    this.stopped = false
    this.step = 0
    const messages = userMessages.map(m => ({ role: m.role, content: m.content }))
    this.emit('start', { workspace: this.workspace })

    while (this.step < this.maxSteps && !this.stopped) {
      this.step++
      this.emit('step', { step: this.step, maxSteps: this.maxSteps })

      let response
      try {
        response = await this.client.messages.create({
          model: this.model,
          max_tokens: 8096,
          system: SYSTEM_PROMPT,
          tools: TOOL_DEFINITIONS,
          messages,
        })
      } catch (err) {
        this.emit('error', { message: err.message })
        throw err
      }

      const assistantContent = []
      let hasToolUse = false
      let finalText = ''

      for (const block of response.content) {
        assistantContent.push(block)
        if (block.type === 'text') {
          finalText += block.text
          this.emit('text', { text: block.text })
        } else if (block.type === 'tool_use') {
          hasToolUse = true
          this.emit('tool_start', { id: block.id, name: block.name, input: block.input })
        }
      }

      messages.push({ role: 'assistant', content: assistantContent })

      if (!hasToolUse || response.stop_reason === 'end_turn') {
        this.emit('done', { text: finalText, steps: this.step })
        return { text: finalText, steps: this.step }
      }

      const toolResults = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const t0 = Date.now()
        const result = await this.executor.execute(block.name, block.input)
        this.emit('tool_result', { id: block.id, name: block.name, input: block.input, result, duration: Date.now() - t0, isError: !!result.error })
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result, null, 2) })
        if (this.stopped) break
      }

      messages.push({ role: 'user', content: toolResults })
    }

    this.emit('done', { text: '', steps: this.step })
    return { text: '', steps: this.step }
  }

}

module.exports = AgentLoop
