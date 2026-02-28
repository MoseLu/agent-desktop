/**
 * Agent Hub - 统一的 Agent 管理器
 * 支持多 Agent 注册、自动降级、错误重试
 */

const { AnthropicAdapter } = require('./adapters/anthropic-adapter')
const { OpenAIAdapter } = require('./adapters/openai-adapter')
const { TOOL_DEFINITIONS } = require('./tools/index')

class AgentHub {
  constructor() {
    this.adapters = new Map()
    this.config = new Map()
    this.maxRetries = 2
    this.retryDelay = 1000 // 1 秒
  }

  /**
   * 注册适配器
   */
  registerAdapter(name, adapter) {
    this.adapters.set(name, adapter)
    console.log(`[AgentHub] 已注册适配器：${name}`)
  }

  /**
   * 配置 API Key
   */
  setApiKey(agentName, apiKey) {
    this.config.set(agentName, apiKey)
    console.log(`[AgentHub] 已配置 ${agentName} 的 API Key`)
  }

  /**
   * 获取适配器（带自动创建）
   */
  getAdapter(agentName, apiKey) {
    // 检查是否已有实例
    const cached = this.adapters.get(agentName)
    if (cached) return cached

    // 根据名称创建适配器
    let adapter
    if (agentName.toLowerCase().includes('openai') || agentName.toLowerCase().includes('gpt')) {
      adapter = new OpenAIAdapter({ apiKey })
    } else if (agentName.toLowerCase().includes('claude') || agentName.toLowerCase().includes('anthropic')) {
      adapter = new AnthropicAdapter({ apiKey })
    } else if (agentName.toLowerCase().includes('minimax')) {
      adapter = new AnthropicAdapter({ 
        apiKey, 
        baseURL: 'https://api.minimaxi.com/anthropic' 
      })
    } else if (agentName.toLowerCase().includes('qwen')) {
      // Qwen 使用 OpenAI 兼容接口
      adapter = new OpenAIAdapter({ 
        apiKey, 
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' 
      })
    }

    if (adapter) {
      this.adapters.set(agentName, adapter)
      return adapter
    }

    throw new Error(`未知的 Agent: ${agentName}`)
  }

  /**
   * 检查 Agent 是否可用
   */
  async checkAvailability(agentName, apiKey) {
    try {
      const adapter = this.getAdapter(agentName, apiKey)
      return await adapter.isAvailable()
    } catch (error) {
      console.warn(`[AgentHub] ${agentName} 可用性检查失败:`, error.message)
      return false
    }
  }

  /**
   * 获取所有可用的 Agent
   */
  async getAvailableAgents(apiKeys) {
    const available = []
    
    for (const [name, apiKey] of Object.entries(apiKeys)) {
      if (!apiKey) continue
      
      try {
        if (await this.checkAvailability(name, apiKey)) {
          available.push(name)
        }
      } catch (error) {
        console.warn(`[AgentHub] 检查 ${name} 失败:`, error.message)
      }
    }
    
    return available
  }

  /**
   * 带重试的聊天调用
   */
  async chatWithRetry(agentName, apiKey, request) {
    let lastError
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const adapter = this.getAdapter(agentName, apiKey)
        const response = await adapter.chat({
          ...request,
          tools: TOOL_DEFINITIONS,
        })
        return response
      } catch (error) {
        lastError = error
        console.warn(`[AgentHub] ${agentName} 第 ${attempt} 次尝试失败:`, error.message)
        
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt))
        }
      }
    }
    
    throw lastError
  }

  /**
   * 带降级的聊天调用（尝试多个 Agent）
   */
  async chatWithFallback(request, preferredAgents, apiKeys) {
    const errors = []

    for (const agentName of preferredAgents) {
      const apiKey = apiKeys[agentName]
      if (!apiKey) {
        console.warn(`[AgentHub] ${agentName} 缺少 API Key，跳过`)
        continue
      }

      try {
        console.log(`[AgentHub] 尝试使用 ${agentName}...`)
        const response = await this.chatWithRetry(agentName, apiKey, request)
        console.log(`[AgentHub] ${agentName} 成功响应`)
        return { agent: agentName, response }
      } catch (error) {
        errors.push({ agent: agentName, error: error.message })
        console.warn(`[AgentHub] ${agentName} 失败:`, error.message)
      }
    }

    const errorMsg = errors.map(e => `${e.agent}: ${e.error}`).join('; ')
    throw new Error(`所有 Agent 均失败：${errorMsg}`)
  }

  /**
   * 智能选择最佳 Agent
   */
  async selectBestAgent(request, apiKeys) {
    // 定义优先级列表
    const priorityList = [
      'MiniMax-M2.5',      // MiniMax 最新模型（推荐）
      'qwen3-coder-next',  // Qwen 最新编程模型
      'claude-sonnet-4-20250514',  // Claude Sonnet
      'gpt-4-turbo',       // GPT-4
      'qwen-plus',         // Qwen Plus
    ]

    // 检查哪些 Agent 可用
    const availableAgents = []
    for (const agentName of priorityList) {
      const apiKey = apiKeys[agentName] || apiKeys[this.getApiKeyName(agentName)]
      if (apiKey && await this.checkAvailability(agentName, apiKey)) {
        availableAgents.push(agentName)
      }
    }

    if (availableAgents.length === 0) {
      throw new Error('没有可用的 Agent，请检查 API Key 配置')
    }

    console.log(`[AgentHub] 可用 Agent: ${availableAgents.join(', ')}`)
    return availableAgents[0] // 返回优先级最高的可用 Agent
  }

  /**
   * 从模型名推断 API Key 名称
   */
  getApiKeyName(modelName) {
    const name = modelName.toLowerCase()
    if (name.includes('minimax')) return 'minimax'
    if (name.includes('qwen')) return 'qwen'
    if (name.includes('claude')) return 'anthropic'
    if (name.includes('gpt')) return 'openai'
    return modelName
  }
}

module.exports = { AgentHub }
