'use strict'

/**
 * 独立代理服务器
 * 
 * 运行方式: node proxy-service.js
 * 默认端口: 4575
 * 
 * 支持:
 *   POST /v1/messages          — Anthropic Messages API 格式
 *   POST /v1/chat/completions  — OpenAI Chat Completions API 格式
 *   GET  /health               — 健康检查
 * 
 * 配置方式（环境变量）:
 *   ANTHROPIC_API_KEY   - Anthropic API Key
 *   MINIMAX_API_KEY    - MiniMax API Key
 *   QWEN_API_KEY       - Qwen API Key
 *   PROXY_PORT         - 服务端口（默认 4575）
 */

const http  = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')

// 加载 .env 文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env')
  console.log('[Proxy] 尝试加载 .env:', envPath)
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim()
          const value = trimmed.slice(eqIdx + 1).trim()
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      }
    })
    console.log('[Proxy] 已加载 .env 文件')
  } else {
    console.log('[Proxy] .env 文件不存在')
  }
}
loadEnvFile()

// 配置
const CONFIG = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  },
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY || '',
    baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com',
  },
  qwen: {
    apiKey: process.env.QWEN_API_KEY || '',
    baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com',
  },
}

const PORT = parseInt(process.env.PROXY_PORT || '4575', 10)

// 打印配置状态
console.log('[Proxy] 配置状态:')
console.log(`  anthropic: ${CONFIG.anthropic.apiKey ? '已配置' : '未配置'}`)
console.log(`  minimax:   ${CONFIG.minimax.apiKey ? '已配置' : '未配置'}`)
console.log(`  qwen:      ${CONFIG.qwen.apiKey ? '已配置' : '未配置'}`)

function detectProvider(model = '') {
  const m = model.toLowerCase()
  if (m.includes('minimax') || m.includes('minimaxi')) return 'minimax'
  if (m.includes('qwen') || m.includes('qwq'))          return 'qwen'
  if (m.includes('glm'))                                   return 'qwen'  // GLM 使用 Qwen Coding Plan
  if (m.includes('kimi'))                                  return 'qwen'  // Kimi 使用 Qwen Coding Plan
  return null
}

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function jsonReply(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

async function handleChatCompletions(req, res) {
  const bodyBuf = await readBody(req)
  let parsed
  try {
    parsed = JSON.parse(bodyBuf.toString())
  } catch {
    return jsonReply(res, 400, { error: { message: 'Invalid JSON body' } })
  }

  const provider = detectProvider(parsed.model)
  if (!provider) {
    return jsonReply(res, 400, { error: { message: `不支持的模型: ${parsed.model}` } })
  }

  const cfg = CONFIG[provider]
  if (!cfg?.apiKey) {
    return jsonReply(res, 401, { error: { message: `未配置 ${provider} API Key` } })
  }

  let targetUrl, authHeader
  if (provider === 'minimax') {
    const base = 'https://api.minimaxi.com/anthropic'
    targetUrl  = `${base}/v1/messages`
    authHeader = { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' }
    return handleMinimaxToAnthropic(parsed, cfg, base, res)
  } else if (provider === 'qwen') {
    // Qwen Coding Plan 使用 Anthropic 兼容接口
    const base = cfg.baseUrl.replace(/\/$/, '')
    return handleQwenToAnthropic(parsed, cfg, base, res)
  } else if (provider === 'anthropic') {
    return handleOpenAIToAnthropic(parsed, cfg, res)
  }

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

async function handleMessages(req, res) {
  const bodyBuf = await readBody(req)
  let parsed
  try {
    parsed = JSON.parse(bodyBuf.toString())
  } catch {
    return jsonReply(res, 400, { error: { message: 'Invalid JSON body' } })
  }

  const provider = detectProvider(parsed.model)
  if (!provider) {
    return jsonReply(res, 400, { error: { type: 'invalid_request_error', message: `不支持的模型: ${parsed.model}` } })
  }

  const cfg = CONFIG[provider]
  if (!cfg?.apiKey) {
    return jsonReply(res, 401, { error: { type: 'authentication_error', message: `未配置 ${provider} API Key` } })
  }

  let targetUrl, headers
  if (provider === 'minimax') {
    const base = 'https://api.minimaxi.com/anthropic'
    targetUrl  = `${base}/v1/messages`
    headers    = { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' }
  } else if (provider === 'anthropic') {
    const base = cfg.baseUrl.replace(/\/$/, '')
    targetUrl  = `${base}/v1/messages`
    headers    = { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' }
  } else {
    return jsonReply(res, 400, { error: { message: `provider ${provider} 不支持 Anthropic 格式` } })
  }

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

async function handleOpenAIToAnthropic(parsed, cfg, res) {
  const base = cfg.baseUrl.replace(/\/$/, '')
  const targetUrl = `${base}/v1/messages`

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

async function handleMinimaxToAnthropic(parsed, cfg, base, res) {
  const systemMsg = parsed.messages?.find(m => m.role === 'system')
  const userMsgs  = (parsed.messages || []).filter(m => m.role !== 'system')

  // 使用 MiniMax-M2.5 模型
  const model = parsed.model?.toLowerCase().includes('text') ? 'MiniMax-M2.5' : (parsed.model || 'MiniMax-M2.5')

  const anthropicBody = {
    model      : model,
    max_tokens : parsed.max_tokens || 8096,
    messages   : userMsgs,
    ...(systemMsg ? { system: systemMsg.content } : {}),
  }

  const bodyBuf = Buffer.from(JSON.stringify(anthropicBody))
  try {
    const result = await forwardHttps(`${base}/v1/messages`, 'POST', {
      'Content-Type'      : 'application/json',
      'x-api-key'         : cfg.apiKey,
      'anthropic-version' : '2023-06-01',
    }, bodyBuf)

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

async function handleQwenToAnthropic(parsed, cfg, base, res) {
  const systemMsg = parsed.messages?.find(m => m.role === 'system')
  const userMsgs  = (parsed.messages || []).filter(m => m.role !== 'system')

  // Qwen Coding Plan 使用 qwen3.5-plus 或其他模型
  const model = parsed.model || 'qwen3.5-plus'

  const anthropicBody = {
    model      : model,
    max_tokens : parsed.max_tokens || 8096,
    messages   : userMsgs,
    ...(systemMsg ? { system: systemMsg.content } : {}),
  }

  const bodyBuf = Buffer.from(JSON.stringify(anthropicBody))
  try {
    const result = await forwardHttps(`${base}/v1/messages`, 'POST', {
      'Content-Type'      : 'application/json',
      'x-api-key'         : cfg.apiKey,
      'anthropic-version' : '2023-06-01',
    }, bodyBuf)

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

async function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    return jsonReply(res, 200, { status: 'ok', port: PORT })
  }

  if (req.method !== 'POST') {
    return jsonReply(res, 405, { error: { message: 'Method not allowed' } })
  }

  const url = req.url?.split('?')[0]

  if (url === '/v1/chat/completions') {
    return handleChatCompletions(req, res)
  }

  if (url === '/v1/messages') {
    return handleMessages(req, res)
  }

  return jsonReply(res, 404, { error: { message: `Unknown endpoint: ${url}` } })
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('[Proxy] Unhandled error:', err)
    try { jsonReply(res, 500, { error: { message: err.message } }) } catch {}
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Proxy] 代理服务器已启动：http://127.0.0.1:${PORT}`)
  console.log(`[Proxy] 端点: POST /v1/chat/completions, POST /v1/messages, GET /health`)
})

server.on('error', (err) => {
  console.error('[Proxy] 服务器错误:', err)
  process.exit(1)
})

process.on('SIGINT', () => {
  console.log('\n[Proxy] 正在关闭...')
  server.close(() => {
    console.log('[Proxy] 已关闭')
    process.exit(0)
  })
})
