'use strict'

/**
 * 代理配置管理器
 *
 * 将 provider API Key 存储在 electron-store 中，与前端 Settings 隔离。
 * 前端可读取"已配置"状态但不能读取明文 Key（仅显示掩码）。
 *
 * @typedef {{ apiKey: string; baseUrl?: string }} ProviderConfig
 * @typedef {{ minimax?: ProviderConfig; qwen?: ProviderConfig; anthropic?: ProviderConfig }} ProxyProviderMap
 */

const STORE_KEYS = {
  minimax   : { apiKey: 'proxy.minimax.apiKey',   baseUrl: 'proxy.minimax.baseUrl'   },
  qwen      : { apiKey: 'proxy.qwen.apiKey',      baseUrl: 'proxy.qwen.baseUrl'      },
  qwenCoding: { apiKey: 'proxy.qwencoding.apiKey', baseUrl: 'proxy.qwencoding.baseUrl' },
  anthropic : { apiKey: 'proxy.anthropic.apiKey', baseUrl: 'proxy.anthropic.baseUrl' },
}

const DEFAULT_BASE_URLS = {
  minimax   : 'https://api.minimaxi.com',
  qwen      : 'https://dashscope.aliyuncs.com',
  qwenCoding: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
  anthropic : 'https://api.anthropic.com',
}

class ProxyConfig {
  constructor(store) {
    this.store = store
  }

  /**
   * 读取所有 provider 的完整配置（含明文 apiKey）。
   * 仅供 Electron 主进程 / 代理服务器内部使用，不应返回给渲染进程。
   * @returns {ProxyProviderMap}
   */
  getAll() {
    const result = {}
    for (const [provider, keys] of Object.entries(STORE_KEYS)) {
      const apiKey = this.store.get(keys.apiKey, '')
      if (apiKey) {
        result[provider] = {
          apiKey,
          baseUrl: this.store.get(keys.baseUrl, DEFAULT_BASE_URLS[provider]),
        }
      }
    }
    return result
  }

  /**
   * 读取单个 provider 配置（供 ProxyServer 的 getConfig 回调使用）。
   */
  get(provider) {
    const keys   = STORE_KEYS[provider]
    if (!keys) return null
    const apiKey = this.store.get(keys.apiKey, '')
    if (!apiKey) return null
    return {
      apiKey,
      baseUrl: this.store.get(keys.baseUrl, DEFAULT_BASE_URLS[provider]),
    }
  }

  /**
   * 保存 provider 配置（由 IPC 调用，apiKey 可为空字符串表示清除）。
   * @param {string} provider
   * @param {{ apiKey?: string; baseUrl?: string }} cfg
   */
  save(provider, cfg) {
    const keys = STORE_KEYS[provider]
    if (!keys) throw new Error(`Unknown provider: ${provider}`)
    if (cfg.apiKey !== undefined) this.store.set(keys.apiKey, cfg.apiKey)
    if (cfg.baseUrl !== undefined) this.store.set(keys.baseUrl, cfg.baseUrl)
  }

  /**
   * 返回可安全发送给渲染进程的状态（apiKey 替换为掩码）。
   * @returns {{ [provider: string]: { configured: boolean; maskedKey: string; baseUrl: string } }}
   */
  getStatus() {
    const status = {}
    for (const [provider, keys] of Object.entries(STORE_KEYS)) {
      const apiKey  = this.store.get(keys.apiKey, '')
      const baseUrl = this.store.get(keys.baseUrl, DEFAULT_BASE_URLS[provider])
      status[provider] = {
        configured : !!apiKey,
        maskedKey  : apiKey ? maskKey(apiKey) : '',
        baseUrl,
      }
    }
    return status
  }

  /**
   * 从旧版 store（单一 apiKey）迁移到新格式（如果尚未迁移）。
   * 将旧 apiKey 视为 MiniMax Key（历史原因）。
   */
  migrateFromLegacy() {
    const legacyKey = this.store.get('apiKey', '')
    if (legacyKey && !this.store.get(STORE_KEYS.minimax.apiKey, '')) {
      this.store.set(STORE_KEYS.minimax.apiKey, legacyKey)
      console.log('[ProxyConfig] 已将旧版 apiKey 迁移为 MiniMax Key')
    }
    const legacyQwenKey = this.store.get('qwenApiKey', '')
    if (legacyQwenKey && !this.store.get(STORE_KEYS.qwen.apiKey, '')) {
      this.store.set(STORE_KEYS.qwen.apiKey, legacyQwenKey)
      console.log('[ProxyConfig] 已将旧版 qwenApiKey 迁移为 Qwen Key')
    }
    const legacyClaudeKey = this.store.get('claudeApiKey', '')
    if (legacyClaudeKey && !this.store.get(STORE_KEYS.anthropic.apiKey, '')) {
      this.store.set(STORE_KEYS.anthropic.apiKey, legacyClaudeKey)
      console.log('[ProxyConfig] 已将旧版 claudeApiKey 迁移为 Anthropic Key')
    }
  }
}

/** 将 API Key 转为掩码形式（前 4 位 + *** + 后 4 位） */
function maskKey(key) {
  if (!key || key.length < 10) return '***'
  return `${key.slice(0, 4)}***${key.slice(-4)}`
}

module.exports = ProxyConfig
