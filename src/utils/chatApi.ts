/**
 * Chat 模式 API 调用工具
 *
 * 路由策略（解决浏览器/Electron dev 模式的 CORS 问题）：
 *  - 真实 Electron 环境：通过 IPC `chat-message` 由 Node.js 主进程发起请求，天然无 CORS
 *  - 浏览器 / Electron dev 模式（带 Vite dev server）：走 Vite proxy 路径，由 dev server 转发
 *
 * 支持：MiniMax（Anthropic 兼容接口）、Qwen（OpenAI 兼容接口）
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

function isMiniMax(model: string) {
  return model.toLowerCase().includes('minimax')
}

function isQwen(model: string) {
  return model.toLowerCase().includes('qwen') || model.toLowerCase().includes('qwq')
}

/** 检测是否在真实 Electron 环境（非 browser mock） */
function isRealElectron(): boolean {
  const el = (window as any).electron
  return !!(el && !el.__isMock)
}

/**
 * 发送单轮对话请求，返回 assistant 回复文本。
 * 抛出错误时调用方负责显示。
 */
export async function sendChatMessage(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<string> {
  if (!apiKey) {
    throw new Error('请先在设置 → 通用中填写 API Key')
  }

  if (isMiniMax(model)) {
    return callMiniMax(apiKey, model, messages)
  }

  if (isQwen(model)) {
    return callQwen(apiKey, model, messages)
  }

  throw new Error(
    `Chat 模式目前支持 MiniMax 和 Qwen 模型。` +
    `如需使用 Claude，请切换到 Code 模式（仅 Electron）。`
  )
}

// ─── MiniMax Anthropic 兼容接口 ───────────────────────────────────────────────

async function callMiniMax(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const body = {
    model,
    max_tokens: 8096,
    messages: messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content })),
  }

  // 真实 Electron：通过 IPC，由 Node.js 主进程发起请求（无 CORS）
  if (isRealElectron()) {
    const result = await (window as any).electron.chatMessage({
      provider: 'minimax',
      apiKey,
      model,
      messages,
    })
    if (!result.ok) {
      throw new Error(`MiniMax API 错误 (${result.status ?? 'network'}): ${result.data?.error?.message ?? result.error ?? '未知错误'}`)
    }
    return (
      result.data.content
        ?.filter((b: any) => b.type === 'text')
        .map((b: any) => b.text as string)
        .join('') ?? ''
    )
  }

  // 浏览器 / Electron dev：走 Vite dev server 代理（绕过 CORS）
  const res = await fetch('/api-proxy/minimax/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(`MiniMax API 错误 (${res.status}): ${err.error?.message ?? res.statusText}`)
  }

  const data = await res.json() as any
  return (
    data.content
      ?.filter((b: any) => b.type === 'text')
      .map((b: any) => b.text as string)
      .join('') ?? ''
  )
}

// ─── Qwen DashScope OpenAI 兼容接口 ──────────────────────────────────────────

async function callQwen(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  // 真实 Electron：通过 IPC，由 Node.js 主进程发起请求（无 CORS）
  if (isRealElectron()) {
    const result = await (window as any).electron.chatMessage({
      provider: 'qwen',
      apiKey,
      model,
      messages,
    })
    if (!result.ok) {
      throw new Error(`Qwen API 错误 (${result.status ?? 'network'}): ${result.data?.error?.message ?? result.error ?? '未知错误'}`)
    }
    return result.data.choices?.[0]?.message?.content ?? ''
  }

  // 浏览器 / Electron dev：走 Vite dev server 代理
  const res = await fetch('/api-proxy/qwen/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(`Qwen API 错误 (${res.status}): ${err.error?.message ?? res.statusText}`)
  }

  const data = await res.json() as any
  return data.choices?.[0]?.message?.content ?? ''
}
