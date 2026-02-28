/**
 * OpenAI API 适配器
 * 支持 GPT-4、GPT-3.5-turbo 等 OpenAI 模型
 */

class OpenAIAdapter {
  constructor({ apiKey, baseURL = 'https://api.openai.com/v1' }) {
    this.apiKey = apiKey
    this.baseURL = baseURL
    this.name = 'openai'
  }

  async chat({ messages, model = 'gpt-4', maxTokens = 8096, temperature = 0.7, tools = [] }) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        ...(tools.length > 0 && {
          tools: tools.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.input_schema,
            }
          })),
        }),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API 错误 (${response.status}): ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const choice = data.choices[0]
    const message = choice.message

    return {
      content: message.content || '',
      toolCalls: message.tool_calls || [],
      finishReason: choice.finish_reason,
      usage: data.usage,
    }
  }

  async isAvailable() {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }
}

module.exports = { OpenAIAdapter }
