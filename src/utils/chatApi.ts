/**
 * Chat 模式 API 调用工具
 *
 * 路由策略：
 *  - 真实 Electron 环境：通过 IPC `chat-message` 由主进程代理服务器转发，
 *    渲染进程无需持有 API Key
 *  - 浏览器 / Electron dev 模式：走 Vite proxy 路径（`/api-proxy/...`），
 *    dev 阶段允许在 localStorage 中临时存储 Key 以方便调试
 *
 * 支持：MiniMax（OpenAI 兼容接口）、Qwen（OpenAI 兼容接口）、Claude（Anthropic）
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

function isMiniMax(model: string) {
  return model.toLowerCase().includes('minimax') || model.toLowerCase().includes('minimaxi')
}

function isQwen(model: string) {
  return model.toLowerCase().includes('qwen') || model.toLowerCase().includes('qwq')
}

function isClaude(model: string) {
  return model.toLowerCase().includes('claude')
}

/** 检测是否在真实 Electron 环境（非 browser mock） */
function isRealElectron(): boolean {
  const el = (window as any).electron
  return !!(el && !el.__isMock)
}

/**
 * 发送单轮对话请求，返回 assistant 回复文本。
 * 渲染进程无需传入 apiKey，由代理服务器/主进程统一管理。
 * _apiKey 参数保留以保持调用签名兼容性（browser dev 模式下仍可用）。
 */
export async function sendChatMessage(
  _apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<string> {
  if (!isMiniMax(model) && !isQwen(model) && !isClaude(model)) {
    throw new Error(
      `Chat 模式目前支持 MiniMax、Qwen 和 Claude 模型。当前模型：${model}`
    )
  }

  // ── Electron 真实环境：通过 IPC 走代理服务器，无 API Key 传输 ──────────────
  if (isRealElectron()) {
    return callViaIpc(model, messages)
  }

  // ── 浏览器 / Electron dev：走 Vite proxy（临时调试方案）────────────────────
  return callViaBrowserProxy(_apiKey, model, messages)
}

// ── IPC 代理调用（Electron 生产模式）──────────────────────────────────────────

async function callViaIpc(model: string, messages: ChatMessage[]): Promise<string> {
  const result = await (window as any).electron.chatMessage({ model, messages })

  if (!result.ok) {
    throw new Error(
      `API 错误 (${result.status ?? 'network'}): ` +
      (result.data?.error?.message ?? result.error ?? '未知错误')
    )
  }

  // 统一从 OpenAI 格式响应中取 content
  const choice = result.data?.choices?.[0]
  return choice?.message?.content ?? ''
}

// ── 浏览器代理调用（开发调试，Vite proxy 转发） ───────────────────────────────

async function callViaBrowserProxy(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<string> {
  let url: string
  let headers: Record<string, string>

  if (isMiniMax(model)) {
    url = '/api-proxy/minimax/v1/text/chatcompletion_v2'
    headers = {
      'Content-Type'  : 'application/json',
      'Authorization' : `Bearer ${apiKey}`,
    }
  } else if (isQwen(model)) {
    url = '/api-proxy/qwen/compatible-mode/v1/chat/completions'
    headers = {
      'Content-Type'  : 'application/json',
      'Authorization' : `Bearer ${apiKey}`,
    }
  } else {
    throw new Error('Claude 模型在 Web 端需要后端代理服务器，请在 Electron 桌面版中使用。')
  }

  const res = await fetch(url, {
    method  : 'POST',
    headers,
    body    : JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 8096,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(`API 错误 (${res.status}): ${err.error?.message ?? res.statusText}`)
  }

  const data = await res.json() as any
  return data.choices?.[0]?.message?.content ?? ''
}
