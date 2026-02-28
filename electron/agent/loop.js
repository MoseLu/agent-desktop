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

// ─── 模型类型检测 ─────────────────────────────────────────────────────────────

function isMiniMaxModel(model) {
  return model && (model.includes('MiniMax') || model.includes('minimax'))
}

function isQwenModel(model) {
  return model && (model.toLowerCase().includes('qwen') || model.toLowerCase().includes('qwq'))
}

// ─── Anthropic / MiniMax 配置 ─────────────────────────────────────────────────

function getAnthropicConfig(apiKey, model) {
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

// ─── Qwen OpenAI 兼容 API 工具转换 ───────────────────────────────────────────

/** 将 Anthropic 工具定义转为 OpenAI function calling 格式 */
function toOpenAITools(tools) {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    }
  }))
}

// ─── AgentLoop：支持 Claude / MiniMax / Qwen ─────────────────────────────────

class AgentLoop {
  constructor({ apiKey, model, workspace, maxSteps, onEvent }) {
    this.apiKey    = apiKey
    this.model     = model
    this.workspace = workspace
    this.maxSteps  = maxSteps
    this.onEvent   = onEvent
    this.executor  = new ToolExecutor(workspace)
    this.stopped   = false
    this.step      = 0

    // Anthropic / MiniMax 使用 SDK；Qwen 使用 fetch
    if (!isQwenModel(model)) {
      const config = getAnthropicConfig(apiKey, model)
      this.client = new Anthropic({
        apiKey: config.apiKey,
        ...(config.baseURL && { baseURL: config.baseURL })
      })
      this.model = config.model
    }
  }

  stop() { this.stopped = true; this.onEvent({ type: 'stopped' }) }
  emit(type, data = {}) { this.onEvent({ type, ...data }) }

  async run(userMessages) {
    if (isQwenModel(this.model)) {
      return this.runQwen(userMessages)
    }
    return this.runAnthropic(userMessages)
  }

  // ─── Anthropic / MiniMax 循环 ───────────────────────────────────────────────

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

  // ─── Qwen OpenAI 兼容循环 ──────────────────────────────────────────────────

  async runQwen(userMessages) {
    this.stopped = false
    this.step = 0

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...userMessages.map(m => ({ role: m.role, content: m.content }))
    ]
    const tools = toOpenAITools(TOOL_DEFINITIONS)

    this.emit('start', { workspace: this.workspace })

    while (this.step < this.maxSteps && !this.stopped) {
      this.step++
      this.emit('step', { step: this.step, maxSteps: this.maxSteps })

      let data
      try {
        const res = await fetch(
          'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.model,
              messages,
              tools,
              max_tokens: 8096,
            }),
          }
        )
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(`Qwen API 错误 (${res.status}): ${errBody.error?.message || res.statusText}`)
        }
        data = await res.json()
      } catch (err) {
        this.emit('error', { message: err.message })
        throw err
      }

      const choice  = data.choices[0]
      const message = choice.message
      let finalText = ''

      if (message.content) {
        finalText = message.content
        this.emit('text', { text: message.content })
      }

      messages.push(message)

      const hasToolCalls = Array.isArray(message.tool_calls) && message.tool_calls.length > 0
      if (!hasToolCalls || choice.finish_reason === 'stop') {
        this.emit('done', { text: finalText, steps: this.step })
        return { text: finalText, steps: this.step }
      }

      // 执行工具调用
      const toolMessages = []
      for (const toolCall of message.tool_calls) {
        const { id, function: { name, arguments: argsStr } } = toolCall
        let input = {}
        try { input = JSON.parse(argsStr) } catch {}

        this.emit('tool_start', { id, name, input })
        const t0 = Date.now()
        const result = await this.executor.execute(name, input)
        this.emit('tool_result', {
          id, name, input, result,
          duration: Date.now() - t0,
          isError: !!result.error,
        })

        toolMessages.push({
          role: 'tool',
          tool_call_id: id,
          content: JSON.stringify(result, null, 2),
        })

        if (this.stopped) break
      }

      messages.push(...toolMessages)
    }

    this.emit('done', { text: '', steps: this.step })
    return { text: '', steps: this.step }
  }
}

module.exports = AgentLoop
