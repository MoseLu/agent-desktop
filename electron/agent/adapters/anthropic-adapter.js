/**
 * Anthropic API 适配器
 * 支持 Claude 系列和 MiniMax（Anthropic 兼容接口）
 */

const Anthropic = require('@anthropic-ai/sdk')

class AnthropicAdapter {
  constructor({ apiKey, baseURL }) {
    this.apiKey = apiKey
    this.baseURL = baseURL
    this.name = 'anthropic'
    
    this.client = new Anthropic({
      apiKey,
      ...(baseURL && { baseURL }),
    })
  }

  async chat({ messages, model = 'claude-sonnet-4-20250514', maxTokens = 8096, temperature = 0.7, tools = [] }) {
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: messages.filter(m => m.role !== 'system'), // Anthropic 不支持 system 消息
        system: messages.find(m => m.role === 'system')?.content,
        tools: tools.length > 0 ? tools : undefined,
      })

      const content = []
      const toolCalls = []

      for (const block of response.content) {
        if (block.type === 'text') {
          content.push(block.text)
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          })
        }
      }

      return {
        content: content.join('\n'),
        toolCalls,
        finishReason: response.stop_reason,
        usage: response.usage,
      }
    } catch (error) {
      if (error.status === 429) {
        throw new Error('API 配额已用尽或余额不足')
      }
      if (error.status === 401) {
        throw new Error('API Key 无效')
      }
      throw error
    }
  }

  async isAvailable() {
    try {
      // 尝试创建一个简单的消息请求
      await this.client.messages.create({
        model: this.baseURL?.includes('minimax') ? 'MiniMax-M2.5' : 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      })
      return true
    } catch (error) {
      console.warn(`[AnthropicAdapter] 可用性检查失败:`, error.message)
      return false
    }
  }
}

module.exports = { AnthropicAdapter }
