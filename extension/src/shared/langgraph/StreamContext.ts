import type { BaseMessage } from "@langchain/core/messages";
import type { SessionStepItem } from "@src/shared/langgraph/runtime/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content.map((p) => (typeof p === "string" ? p : (p as { text?: string })?.text ?? "")).join("");
  return "";
}

function msgType(m: unknown): string {
  const msg = m as { getType?: () => string; _getType?: () => string; type?: string };
  return msg?.getType?.() ?? msg?._getType?.() ?? msg?.type ?? "";
}

function truncate(value: unknown, max = 140): string {
  if (value == null) return "";
  const text = (typeof value === "string" ? value : JSON.stringify(value)).trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function parseStreamChunk(payload: unknown): { content: string; reasoning: string } {
  if (!Array.isArray(payload)) return { content: "", reasoning: "" };
  const chunk = payload[0] as Record<string, unknown> | undefined;
  if (!chunk) return { content: "", reasoning: "" };

  const content = toText(chunk.content);
  const kw = (chunk.additional_kwargs ?? {}) as Record<string, unknown>;

  let reasoning = toText(chunk.reasoning ?? chunk.reasoning_content ?? kw.reasoning ?? kw.reasoning_content);
  if (!reasoning && kw.__raw_response && typeof kw.__raw_response === "object") {
    const delta = (kw.__raw_response as { choices?: Array<{ delta?: Record<string, unknown> }> }).choices?.[0]?.delta;
    if (delta) reasoning = toText(delta.reasoning ?? delta.reasoning_content);
  }
  return { content, reasoning };
}

/** Deterministic IDs based on message index + position within that message. */
function extractMessageItems(runMessages: BaseMessage[]): SessionStepItem[] {
  const items: SessionStepItem[] = [];

  for (let mi = 0; mi < runMessages.length; mi++) {
    const msg = runMessages[mi];
    const type = msgType(msg);
    let pos = 0;
    const id = (suffix: string) => `m${mi}_${pos++}_${suffix}`;

    if (type === "ai") {
      const ai = msg as {
        content?: unknown;
        tool_calls?: Array<{ name?: string; args?: unknown }>;
        additional_kwargs?: { reasoning_content?: string; tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> };
      };

      const reasoning = ai.additional_kwargs?.reasoning_content ?? "";
      if (reasoning) items.push({ id: id("r"), type: "reasoning", content: reasoning });

      const direct = ai.tool_calls ?? [];
      const raw = ai.additional_kwargs?.tool_calls ?? [];
      const calls = direct.length
        ? direct.map((c) => ({ name: (c.name ?? "").trim(), args: truncate(c.args) }))
        : raw.map((c) => ({ name: (c.function?.name ?? "").trim(), args: truncate(c.function?.arguments) }));

      const aiContent = toText(ai.content);
      if (aiContent && calls.length) items.push({ id: id("c"), type: "content", content: aiContent });

      for (const c of calls) {
        if (c.name) items.push({ id: id("ts"), type: "tool_selected", content: c.args, toolName: c.name });
      }
    }

    if (type === "tool") {
      const t = msg as { name?: string; content?: unknown };
      const name = (t.name ?? "").trim();
      const resultText = t.content != null
        ? (typeof t.content === "string" ? t.content : JSON.stringify(t.content))
        : "";
      if (name) items.push({ id: id("te"), type: "tool_executed", content: resultText, toolName: name });
    }
  }
  return items;
}

const TOOL_STATUS_LABELS: Record<string, string> = {
  search: "Searching the web...",
  web_search: "Searching the web...",
  open_url_and_get_content: "Reading the page...",
  page_content: "Reading the page...",
  get_page_content: "Reading the page...",
  get_page_layout: "Reading page layout...",
  research: "Researching...",
  summary: "Summarizing...",
};

function inferStatusMessage(runMessages: BaseMessage[]): string | undefined {
  for (let i = runMessages.length - 1; i >= 0; i--) {
    if (msgType(runMessages[i]) === "tool") {
      const name = (runMessages[i] as { name?: string }).name ?? "";
      return i === runMessages.length - 1
        ? (TOOL_STATUS_LABELS[name] ?? (name ? `Using ${name}...` : "Working..."))
        : "Writing...";
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// StreamContext
// ---------------------------------------------------------------------------

export interface DraftPatch {
  content: string;
  statusMessage: string;
  reasoning: string;
  stepItems: SessionStepItem[];
}

export class StreamContext {
  private confirmedText = "";
  private streamDelta = "";
  private reasoning = "";
  private stepItems: SessionStepItem[] = [];
  private prevItemCount = 0;
  private reasoningSeq = 0;

  lastValues: BaseMessage[] | null = null;

  constructor(private inputCount: number) {}

  get content(): string { return this.confirmedText || this.streamDelta; }

  handleChunk(payload: unknown): void {
    const tuple = payload as [unknown, unknown];
    const chunk = Array.isArray(tuple) ? tuple[0] : payload;
    if (msgType(chunk) !== "ai") return;
    const { content: token, reasoning } = parseStreamChunk(payload);
    if (reasoning) this.reasoning += reasoning;
    if (token) this.streamDelta += token;
  }

  handleValues(allMessages: BaseMessage[]): void {
    this.lastValues = allMessages;
    const run = allMessages.slice(this.inputCount);

    const items = extractMessageItems(run);
    if (items.length > this.prevItemCount) {
      const firstNew = items[this.prevItemCount];
      if (this.reasoning.trim()) {
        if (firstNew?.type === "reasoning") {
          this.reasoning = "";
        } else {
          this.snapshotReasoning();
        }
      }
      this.stepItems = [...this.stepItems, ...items.slice(this.prevItemCount)];
      this.prevItemCount = items.length;
    }

    this.streamDelta = "";
    const last = allMessages[allMessages.length - 1];
    if (last && msgType(last) === "ai") {
      const ai = last as { content?: unknown; tool_calls?: unknown[] };
      const hasToolCalls = Array.isArray(ai.tool_calls) && ai.tool_calls.length > 0;
      if (!hasToolCalls) {
        const t = toText(ai.content);
        if (t) this.confirmedText = t;
      }
    }
  }

  draft(): DraftPatch {
    const hasTokens = !!(this.streamDelta || this.confirmedText);
    const status = hasTokens ? "Writing..." : this.reasoning ? "Thinking..." : "Working...";
    const runStatus = this.lastValues
      ? inferStatusMessage(this.lastValues.slice(this.inputCount))
      : undefined;
    return {
      content: this.content,
      statusMessage: runStatus ?? status,
      reasoning: this.reasoning,
      stepItems: this.stepItems,
    };
  }

  finalize(): { content: string; stepItems: SessionStepItem[] } {
    this.snapshotReasoning();
    return { content: this.content || "(No response)", stepItems: this.stepItems };
  }

  private snapshotReasoning(): void {
    if (!this.reasoning.trim()) return;
    this.reasoningSeq += 1;
    this.stepItems = [
      ...this.stepItems,
      { id: `r_${this.reasoningSeq}`, type: "reasoning", content: this.reasoning.trim() },
    ];
    this.reasoning = "";
  }
}
