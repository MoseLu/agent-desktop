/**
 * Chat 模式 API 调用工具
 *
 * API Key 和接入地址通过环境变量配置（与 Coding Plan / MiniMax 一致）：
 *   ANTHROPIC_AUTH_TOKEN  — API Key
 *   ANTHROPIC_BASE_URL    — 自定义接入点（默认 https://api.anthropic.com）
 *
 * 路由策略：
 *  - 真实 Electron 环境：通过 IPC `chat-message` 由 Node.js 主进程发起请求，天然无 CORS
 *  - 浏览器环境：不支持 Chat 模式（API Key 不在前端）
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
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
  model: string,
  messages: ChatMessage[]
): Promise<string> {
  if (!isRealElectron()) {
    throw new Error('Chat 模式需要在 Electron 桌面端运行，API Key 通过 ANTHROPIC_AUTH_TOKEN 环境变量配置')
  }

  const result = await (window as any).electron.chatMessage({ model, messages })

  if (!result.ok) {
    throw new Error(
      `API 错误 (${result.status ?? 'network'}): ${
        result.data?.error?.message ?? result.error ?? '未知错误'
      }`
    )
  }

  // Anthropic 兼容响应格式
  return (
    result.data.content
      ?.filter((b: any) => b.type === 'text')
      .map((b: any) => b.text as string)
      .join('') ??
    result.data.choices?.[0]?.message?.content ??
    ''
  )
}
