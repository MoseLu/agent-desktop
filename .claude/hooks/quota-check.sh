#!/usr/bin/env bash
# .claude/hooks/quota-check.sh
#
# PreToolUse hook — 任务执行前 API 配额检查
#
# 工作原理：
#   1. 读取 Hook 传入的工具名称（stdin JSON）
#   2. 使用 60 秒去重窗口，避免同一任务的每次工具调用都触发
#   3. 向 Anthropic API 发送最小请求，读取速率限制响应头
#   4. 根据工具类型估算本次任务的 token 消耗
#   5. 三种结果：
#      - 充足 (≥25% 且 ≥ 估算)：打印摘要，允许继续
#      - 偏低 (10%–25%)：在终端询问用户是否继续
#      - 不足 (<10% 或 < 估算)：阻断并给出重置时间提示
#
# 依赖：curl, bash 4+（macOS/Linux 均已内置）
# 环境变量：ANTHROPIC_API_KEY（必须）

set -uo pipefail

# ── 1. 读取 Hook 输入（stdin JSON） ─────────────────────────────────────────
HOOK_INPUT=$(cat 2>/dev/null || true)

# 解析工具名称（优先 python3，回退到纯 grep/sed）
if command -v python3 >/dev/null 2>&1; then
  TOOL_NAME=$(printf '%s' "$HOOK_INPUT" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name',''))" \
    2>/dev/null || true)
else
  TOOL_NAME=$(printf '%s' "$HOOK_INPUT" \
    | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | head -1 \
    | sed 's/.*"\([^"]*\)"[[:space:]]*$/\1/' \
    2>/dev/null || true)
fi
TOOL_NAME="${TOOL_NAME:-unknown}"

# ── 2. 60 秒去重：同一任务轮次只检查一次 ────────────────────────────────────
STATE_FILE="/tmp/.claude_quota_${USER:-nobody}"
NOW=$(date +%s)

if [ -f "$STATE_FILE" ]; then
  LAST=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
  DIFF=$(( NOW - LAST ))
  if [ "$DIFF" -lt 60 ]; then
    echo '{"decision":"allow"}'
    exit 0
  fi
fi
echo "$NOW" > "$STATE_FILE"

# ── 3. 确认 API Key ──────────────────────────────────────────────────────────
API_KEY="${ANTHROPIC_API_KEY:-}"
if [ -z "$API_KEY" ]; then
  # 无法检查，放行（后续调用会触发认证错误）
  echo '{"decision":"allow"}'
  exit 0
fi

# ── 4. 最小化 API 调用，获取速率限制响应头 ───────────────────────────────────
TMP_HDRS=$(mktemp /tmp/.claude_quota_hdrs.XXXXXX)
HTTP_CODE=$(curl -s \
  -o /dev/null \
  -D "$TMP_HDRS" \
  -w "%{http_code}" \
  --max-time 10 \
  -X POST "https://api.anthropic.com/v1/messages" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":1,"messages":[{"role":"user","content":"1"}]}' \
  2>/dev/null) || HTTP_CODE="000"

# 辅助函数：从响应头中提取字段值
get_hdr() {
  grep -i "^${1}:" "$TMP_HDRS" 2>/dev/null \
    | tail -1 \
    | awk '{print $2}' \
    | tr -d '\r\n'
}

# ── 5. 处理 API 级错误 ───────────────────────────────────────────────────────
if [ "$HTTP_CODE" = "401" ]; then
  rm -f "$TMP_HDRS"
  echo '{"decision":"block","reason":"[配额检查] API 密钥无效 (401)，请在环境中更新 ANTHROPIC_API_KEY。"}'
  exit 0
fi

if [ "$HTTP_CODE" = "429" ]; then
  rm -f "$TMP_HDRS"
  echo '{"decision":"block","reason":"[配额检查] 已触发速率限制 (429)，请稍候再试。"}'
  exit 0
fi

# ── 6. 解析速率限制响应头 ────────────────────────────────────────────────────
TOK_LIMIT=$(get_hdr "anthropic-ratelimit-tokens-limit")
TOK_REMAINING=$(get_hdr "anthropic-ratelimit-tokens-remaining")
RESET_AT=$(get_hdr "anthropic-ratelimit-tokens-reset")
rm -f "$TMP_HDRS"

# 无法获取配额数据时放行
if [ -z "$TOK_REMAINING" ] || [ -z "$TOK_LIMIT" ] || [ "$TOK_LIMIT" -eq 0 ] 2>/dev/null; then
  echo '{"decision":"allow"}'
  exit 0
fi

# ── 7. 计算使用率 ────────────────────────────────────────────────────────────
TOK_USED=$(( TOK_LIMIT - TOK_REMAINING ))
PCT_USED=$(( TOK_USED * 100 / TOK_LIMIT ))
PCT_LEFT=$(( 100 - PCT_USED ))

# ── 8. 根据工具类型估算本次任务 token 消耗 ───────────────────────────────────
case "$TOOL_NAME" in
  Agent)                     EST=20000 ;;
  Bash)                      EST=10000 ;;
  Write|NotebookEdit)        EST=8000  ;;
  WebFetch|WebSearch)        EST=8000  ;;
  Edit)                      EST=6000  ;;
  Read)                      EST=5000  ;;
  Grep|Glob|TodoWrite)       EST=3000  ;;
  *)                         EST=5000  ;;
esac

# ── 9. 构建可视化进度条 ──────────────────────────────────────────────────────
BAR_FILLED=$(( PCT_USED / 5 ))
BAR_EMPTY=$(( 20 - BAR_FILLED ))
BAR="["
i=0; while [ $i -lt $BAR_FILLED ]; do BAR="${BAR}█"; i=$(( i + 1 )); done
i=0; while [ $i -lt $BAR_EMPTY  ]; do BAR="${BAR}░"; i=$(( i + 1 )); done
BAR="${BAR}] ${PCT_USED}% 已用"

RESET_INFO="${RESET_AT:-未知}"

# ── 10. 决策逻辑 ─────────────────────────────────────────────────────────────

# 情况 A：明确不足（剩余 < 估算消耗）
if [ "$TOK_REMAINING" -lt "$EST" ] 2>/dev/null; then
  MSG="━━ API 配额检查 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  配额总量  : ${TOK_LIMIT} tokens/分钟
  当前剩余  : ${TOK_REMAINING} tokens  ${BAR}
  窗口重置  : ${RESET_INFO}
  ─────────────────────────────────────────────────
  当前工具  : ${TOOL_NAME}
  预估消耗  : ~${EST} tokens
  判断结果  : ❌ 配额不足（剩余 ${TOK_REMAINING} < 预估 ${EST}）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf '\n%s\n\n' "$MSG" >/dev/tty 2>/dev/null || printf '\n%s\n\n' "$MSG" >&2
  echo "{\"decision\":\"block\",\"reason\":\"配额不足：剩余 ${TOK_REMAINING} tokens，本次工具(${TOOL_NAME})预估需要 ~${EST} tokens。请等待配额窗口重置（${RESET_INFO}）后再试。\"}"
  exit 0
fi

# 情况 B：配额偏低（剩余 < 25%）——在终端询问用户
if [ "$PCT_LEFT" -lt 25 ] 2>/dev/null; then
  MSG="━━ API 配额检查 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  配额总量  : ${TOK_LIMIT} tokens/分钟
  当前剩余  : ${TOK_REMAINING} tokens  ${BAR}
  窗口重置  : ${RESET_INFO}
  ─────────────────────────────────────────────────
  当前工具  : ${TOOL_NAME}
  预估消耗  : ~${EST} tokens
  判断结果  : ⚠️  配额偏低（剩余 ${PCT_LEFT}%），建议评估是否继续
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ -c /dev/tty ]; then
    printf '\n%s\n\n' "$MSG" >/dev/tty
    printf '是否继续执行此任务? [Y/n]: ' >/dev/tty
    read -r RESP </dev/tty || RESP="y"
    RESP=$(printf '%s' "$RESP" | tr '[:upper:]' '[:lower:]')
    if [[ "$RESP" == n* ]]; then
      echo '{"decision":"block","reason":"用户取消：配额偏低，用户选择暂停执行以保留 API 配额。请等待配额重置后再试。"}'
      exit 0
    fi
  else
    # 非交互环境（如远程 session）：打印警告但不阻断
    printf '\n%s\n\n' "$MSG" >&2
  fi
fi

# 情况 C：配额充足——打印摘要后放行
ENOUGH_ICON="✅ 配额充足"
[ "$PCT_LEFT" -lt 25 ] && ENOUGH_ICON="⚠️  用户确认继续"
MSG="━━ API 配额检查 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  配额总量  : ${TOK_LIMIT} tokens/分钟
  当前剩余  : ${TOK_REMAINING} tokens  ${BAR}
  窗口重置  : ${RESET_INFO}
  ─────────────────────────────────────────────────
  当前工具  : ${TOOL_NAME}
  预估消耗  : ~${EST} tokens
  判断结果  : ${ENOUGH_ICON}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf '\n%s\n\n' "$MSG" >/dev/tty 2>/dev/null || printf '\n%s\n\n' "$MSG" >&2

echo '{"decision":"allow"}'
exit 0
