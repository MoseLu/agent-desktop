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

// 判断是否使用 MiniMax API
function isMiniMaxModel(model) {
  return model && (model.includes('MiniMax') || model.includes('minimax'))
}

// 获取 API 配置
function getAPIConfig(apiKey, model) {
  if (isMiniMaxModel(model)) {
    return {
      apiKey,
      baseURL: 'https://api.minimaxi.com/anthropic',
      model: model || 'MiniMax-M2.5'
    }
  }
  return {
    apiKey,
    model: model || 'claude-sonnet-4-20250514'
  }
}

class AgentLoop {
  constructor({ apiKey, model, workspace, maxSteps, onEvent }) {
    const config = getAPIConfig(apiKey, model)
    
    // MiniMax 使用 Anthropic 兼容接口
    this.client = new Anthropic({ 
      apiKey: config.apiKey,
      ...(config.baseURL && { baseURL: config.baseURL })
    })
    this.model = config.model
    this.workspace = workspace
    this.maxSteps = maxSteps
    this.onEvent = onEvent
    this.executor = new ToolExecutor(workspace)
    this.stopped = false
    this.step = 0
  }

  stop() { this.stopped = true; this.onEvent({ type: 'stopped' }) }
  emit(type, data = {}) { this.onEvent({ type, ...data }) }

  async run(userMessages) {
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
