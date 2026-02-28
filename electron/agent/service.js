'use strict'

const AgentLoop  = require('./loop')
const ProxyConfig = require('../proxy/config')

/**
 * AgentService — 管理多个并发 Agent 会话，每个 conversationId 独立隔离。
 * 与传输层（IPC / HTTP）无关，可直接迁移到 NestJS Injectable。
 */
class AgentService {
  constructor(store) {
    this.store    = store
    /** @type {Map<string, AgentLoop>} conversationId → 运行中的 AgentLoop */
    this.sessions = new Map()
  }

  _getConfig() {
    const model    = this.store.get('model', 'claude-sonnet-4-20250514')
    const proxyCfg = new ProxyConfig(this.store)

    // 根据模型名选择对应 provider 的 API Key（从代理配置读取，不经由渲染进程）
    let apiKey = ''
    const m = (model || '').toLowerCase()
    if (m.includes('minimax') || m.includes('minimaxi')) {
      apiKey = proxyCfg.get('minimax')?.apiKey || ''
    } else if (m.includes('qwen') || m.includes('qwq') || m.includes('coding')) {
      // 百炼 Coding Plan 优先匹配
      if (m.includes('coding')) {
        apiKey = proxyCfg.get('qwenCoding')?.apiKey || ''
      } else {
        apiKey = proxyCfg.get('qwen')?.apiKey || ''
      }
    } else if (m.includes('claude')) {
      apiKey = proxyCfg.get('anthropic')?.apiKey || ''
    } else {
      // 回退到旧版单一 apiKey 字段（向后兼容）
      apiKey = this.store.get('apiKey', '')
    }

    return { apiKey, model, maxSteps: this.store.get('maxSteps', 50) }
  }

  /**
   * 启动（或替换）某对话的 Agent 任务。
   * @param {string}   conversationId  对话唯一 ID，用作会话 key
   * @param {{ messages: object[], workspace: string }} params
   * @param {(ev: object) => void} onEvent  事件回调，自动附带 conversationId
   */
  async run(conversationId, { messages, workspace }, onEvent) {
    const { apiKey, model, maxSteps } = this._getConfig()
    if (!apiKey) return { error: '请先在代理配置中设置对应模型的 API Key' }

    // 同一对话已有运行中的 loop → 先停止
    this.stop(conversationId)

    const loop = new AgentLoop({
      apiKey, model, workspace, maxSteps,
      onEvent: (ev) => onEvent({ ...ev, conversationId }),
    })
    this.sessions.set(conversationId, loop)

    try {
      return { result: await loop.run(messages) }
    } finally {
      this.sessions.delete(conversationId)
    }
  }

  /**
   * 停止指定对话的 Agent 任务。
   * @param {string} conversationId
   * @returns {boolean} 是否有任务被停止
   */
  stop(conversationId) {
    const loop = this.sessions.get(conversationId)
    if (!loop) return false
    loop.stop()
    this.sessions.delete(conversationId)
    return true
  }

  /** 停止所有正在运行的会话（应用退出时调用）。 */
  stopAll() {
    for (const loop of this.sessions.values()) loop.stop()
    this.sessions.clear()
  }

  /** @param {string} conversationId */
  isRunning(conversationId) {
    return this.sessions.has(conversationId)
  }
}

module.exports = AgentService
