import { AIMessage, type BaseMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";

function kind(m: BaseMessage): string {
  return typeof m.getType === "function" ? m.getType() : (m as { _getType?: () => string })._getType?.() ?? "";
}

function isHuman(m: BaseMessage): boolean {
  return m instanceof HumanMessage || kind(m) === "human";
}

function isTool(m: BaseMessage): boolean {
  return m instanceof ToolMessage || kind(m) === "tool";
}

function isAi(m: BaseMessage): boolean {
  return m instanceof AIMessage || kind(m) === "ai";
}

function toolCallIds(ai: AIMessage): string[] {
  const direct = (ai.tool_calls ?? [])
    .map((c) => (typeof c.id === "string" ? c.id : ""))
    .filter(Boolean);
  if (direct.length) return direct;
  const raw = (ai.additional_kwargs?.tool_calls ?? []) as Array<{ id?: string }>;
  return raw.map((c) => c.id).filter((id): id is string => typeof id === "string" && id.length > 0);
}

/**
 * OpenAI-compatible APIs reject requests where a `tool` message is not preceded by
 * `assistant` with `tool_calls`, or where `assistant` has `tool_calls` but no matching
 * `tool` messages before the next user turn. Strip dangling tool_calls so follow-up
 * user messages do not break the request.
 */
export function sanitizeOpenAIToolSequences(messages: BaseMessage[]): BaseMessage[] {
  const out = [...messages];
  for (let i = 0; i < out.length; i++) {
    if (!isHuman(out[i])) continue;
    let j = i - 1;
    const answered = new Set<string>();
    while (j >= 0 && isTool(out[j])) {
      const tid = (out[j] as ToolMessage).tool_call_id;
      if (tid) answered.add(tid);
      j--;
    }
    if (j < 0 || !isAi(out[j])) continue;
    const ai = out[j] as AIMessage;
    const needed = toolCallIds(ai);
    if (!needed.length) continue;
    const missing = needed.some((id) => !answered.has(id));
    if (!missing) continue;
    const prior = typeof ai.content === "string" ? ai.content : "";
    const note =
      "(The previous assistant turn requested tools but tool results were not recorded before your message.)";
    out[j] = new AIMessage({
      content: prior.trim() ? `${prior}\n\n${note}` : note,
      tool_calls: [],
      additional_kwargs: { ...ai.additional_kwargs, tool_calls: [] },
    });
  }
  return out;
}
