'use strict'

/**
 * 本地代理服务器
 *
 * 以 HTTP 服务器形式运行于 Electron 主进程内（127.0.0.1 随机端口）。
 * 前端只需传 model + messages，无需携带 API Key。
 * 服务器根据 model 名称路由到 MiniMax / Qwen，并从配置中读取密钥。
 *
 * 支持两类端点：
 *   POST /v1/messages          — Anthropic Messages API 格式（供 agent loop 使用）
 *   POST /v1/chat/completions  — OpenAI Chat Completions API 格式（供 chat 模式使用）
 *   GET  /health               — 健康检查
 */

const http  = require('http')
const https = require('https')

// ─── 模型路由 ────────────────────────────────────────────────────────────────

function detectProvider(model = '') {
  const m = model.toLowerCase()
  if (m.includes('minimax') || m.includes('minimaxi')) return 'minimax'
  if (m.includes('qwen') || m.includes('qwq'))          return 'qwen'
  if (m.includes('claude'))                             return 'anthropic'
  return null
}

// ─── HTTP 请求转发（原生，无第三方依赖） ──────────────────────────────────────

function forwardHttps(targetUrl, method, headers, bodyBuf) {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl)
    const isHttps = u.protocol === 'https:'
    const lib = isHttps ? https : http

    const reqOpts = {
      hostname : u.hostname,
      port     : u.port || (isHttps ? 443 : 80),
      path     : u.pathname + u.search,
      method,
      headers  : { ...headers, 'Content-Length': bodyBuf.length },
    }

    const req = lib.request(reqOpts, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }))
    })
    req.on('error', reject)
    req.write(bodyBuf)
    req.end()
  })
}

// ─── 读取请求 body ────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// ─── JSON 响应帮助 ────────────────────────────────────────────────────────────

function jsonReply(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

// ─── ProxyServer ──────────────────────────────────────────────────────────────

class ProxyServer {
  /**
   * @param {() => import('./config').ProxyProviderMap} getConfig
   *   每次请求时调用，返回最新 provider 配置（apiKey + baseUrl）
   */
  constructor(getConfig) {
    this.getConfig = getConfig
    this.server    = null
    this.port      = 0
  }

  // ── 路由 /v1/chat/completions（OpenAI 格式） ─────────────────────────────

  async _handleChatCompletions(parsed, res) {
    const provider = detectProvider(parsed.model)
    if (!provider) {
      return jsonReply(res, 400, { error: { message: `不支持的模型: ${parsed.model}` } })
    }

    const cfg = this.getConfig()[provider]
    if (!cfg?.apiKey) {
      return jsonReply(res, 401, { error: { message: `未配置 ${provider} API Key，请在代理配置中设置` } })
    }

    let targetUrl, authHeader
    if (provider === 'minimax') {
      const base = (cfg.baseUrl || 'https://api.minimaxi.com').replace(/\/$/, '')
      targetUrl  = `${base}/v1/text/chatcompletion_v2`
      authHeader = { Authorization: `Bearer ${cfg.apiKey}` }
    } else if (provider === 'qwen') {
      const base = (cfg.baseUrl || 'https://dashscope.aliyuncs.com').replace(/\/$/, '')
      targetUrl  = `${base}/compatible-mode/v1/chat/completions`
      authHeader = { Authorization: `Bearer ${cfg.apiKey}` }
    } else if (provider === 'anthropic') {
      // 将 OpenAI 格式转为 Anthropic 格式再发送（简单适配）
      return this._handleOpenAIToAnthropic(parsed, cfg, res)
    }

    const bodyBuf = Buffer.from(JSON.stringify(parsed))
    try {
      const result = await forwardHttps(targetUrl, 'POST', {
        'Content-Type': 'application/json',
        ...authHeader,
      }, bodyBuf)

      res.writeHead(result.status, { 'Content-Type': 'application/json' })
      res.end(result.body)
    } catch (err) {
      jsonReply(res, 502, { error: { message: `上游请求失败: ${err.message}` } })
    }
  }

  // ── 路由 /v1/messages（Anthropic 格式） ──────────────────────────────────

  async _handleMessages(parsed, res) {
    const provider = detectProvider(parsed.model)
    if (!provider) {
      return jsonReply(res, 400, { error: { type: 'invalid_request_error', message: `不支持的模型: ${parsed.model}` } })
    }

    const cfg = this.getConfig()[provider]
    if (!cfg?.apiKey) {
      return jsonReply(res, 401, { error: { type: 'authentication_error', message: `未配置 ${provider} API Key` } })
    }

    let targetUrl, headers
    if (provider === 'minimax') {
      const base = (cfg.baseUrl || 'https://api.minimaxi.com').replace(/\/$/, '')
      targetUrl  = `${base}/anthropic/v1/messages`
      headers    = { 'X-API-Key': cfg.apiKey, 'anthropic-version': '2023-06-01' }
    } else if (provider === 'anthropic') {
      const base = (cfg.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '')
      targetUrl  = `${base}/v1/messages`
      headers    = { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' }
    } else {
      return jsonReply(res, 400, { error: { message: `provider ${provider} 不支持 Anthropic 格式` } })
    }

    const bodyBuf = Buffer.from(JSON.stringify(parsed))
    try {
      const result = await forwardHttps(targetUrl, 'POST', {
        'Content-Type': 'application/json',
        ...headers,
      }, bodyBuf)

      res.writeHead(result.status, { 'Content-Type': 'application/json' })
      res.end(result.body)
    } catch (err) {
      jsonReply(res, 502, { error: { message: `上游请求失败: ${err.message}` } })
    }
  }

  // ── OpenAI → Anthropic 格式转换（供 claude 模型 chat 模式） ──────────────

  async _handleOpenAIToAnthropic(parsed, cfg, res) {
    const base    = (cfg.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '')
    const targetUrl = `${base}/v1/messages`

    // 提取 system prompt
    const systemMsg = parsed.messages?.find(m => m.role === 'system')
    const userMsgs  = (parsed.messages || []).filter(m => m.role !== 'system')

    const anthropicBody = {
      model      : parsed.model,
      max_tokens : parsed.max_tokens || 8096,
      messages   : userMsgs,
      ...(systemMsg ? { system: systemMsg.content } : {}),
    }

    const bodyBuf = Buffer.from(JSON.stringify(anthropicBody))
    try {
      const result = await forwardHttps(targetUrl, 'POST', {
        'Content-Type'      : 'application/json',
        'x-api-key'         : cfg.apiKey,
        'anthropic-version' : '2023-06-01',
      }, bodyBuf)

      // 将 Anthropic 响应转为 OpenAI 格式
      if (result.status === 200) {
        const data    = JSON.parse(result.body.toString())
        const content = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''
        const openAIResp = {
          id      : data.id || `chatcmpl-${Date.now()}`,
          object  : 'chat.completion',
          created : Math.floor(Date.now() / 1000),
          model   : data.model || parsed.model,
          choices : [{ index: 0, message: { role: 'assistant', content }, finish_reason: data.stop_reason || 'stop' }],
          usage   : data.usage || {},
        }
        jsonReply(res, 200, openAIResp)
      } else {
        res.writeHead(result.status, { 'Content-Type': 'application/json' })
        res.end(result.body)
      }
    } catch (err) {
      jsonReply(res, 502, { error: { message: `上游请求失败: ${err.message}` } })
    }
  }

  // ── 主请求处理 ────────────────────────────────────────────────────────────

  async _handleRequest(req, res) {
    // 允许本地跨域
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method === 'GET' && req.url === '/health') {
      return jsonReply(res, 200, { status: 'ok', port: this.port })
    }

    if (req.method !== 'POST') {
      return jsonReply(res, 405, { error: { message: 'Method not allowed' } })
    }

    const bodyBuf = await readBody(req)
    let parsed
    try {
      parsed = JSON.parse(bodyBuf.toString())
    } catch {
      return jsonReply(res, 400, { error: { message: 'Invalid JSON body' } })
    }

    const url = req.url?.split('?')[0]

    if (url === '/v1/chat/completions') {
      return this._handleChatCompletions(parsed, res)
    }

    if (url === '/v1/messages') {
      return this._handleMessages(parsed, res)
    }

    return jsonReply(res, 404, { error: { message: `Unknown endpoint: ${url}` } })
  }

  // ── 生命周期 ──────────────────────────────────────────────────────────────

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this._handleRequest(req, res).catch(err => {
          console.error('[Proxy] Unhandled error:', err)
          try { jsonReply(res, 500, { error: { message: err.message } }) } catch {}
        })
      })

      this.server.listen(0, '127.0.0.1', () => {
        this.port = this.server.address().port
        console.log(`[Proxy] 代理服务器已启动：http://127.0.0.1:${this.port}`)
        resolve(this.port)
      })

      this.server.on('error', reject)
    })
  }

  stop() {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => resolve())
        this.server = null
      } else {
        resolve()
      }
    })
  }
}

module.exports = ProxyServer
