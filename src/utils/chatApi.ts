/**
 * Chat 模式直接 API 调用工具
 *
 * - 不经过 Electron IPC / agent loop
 * - 支持 MiniMax（Anthropic 兼容）、Qwen（OpenAI 兼容）
 * - 浏览器和 Electron 均可使用（无 CORS 限制问题取决于 API 服务商配置）
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

  // Claude / 其他模型：浏览器模式因 CORS 不支持，Electron 已有 agent loop 处理
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
    // MiniMax Anthropic 接口需要 user/assistant 角色（不支持 system role，改用 system prompt）
    messages: messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content })),
  }

  const res = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
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
  const res = await fetch(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(`Qwen API 错误 (${res.status}): ${err.error?.message ?? res.statusText}`)
  }

  const data = await res.json() as any
  return data.choices?.[0]?.message?.content ?? ''
}
