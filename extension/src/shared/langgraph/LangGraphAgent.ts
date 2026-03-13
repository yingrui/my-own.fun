import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import { createChatModel } from "@src/shared/langgraph/ModelAdapter";
import { buildAgentGraph } from "@src/shared/langgraph/agentGraph";
import type { Skill } from "@src/shared/langgraph/skills";
import { resetResearchSession } from "@src/shared/langgraph/skills/research";
import type {
  ChatSession,
  SessionMessage,
  SessionStepItem,
  SessionState,
  SessionStateListener,
} from "@src/shared/langgraph/runtime/types";

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
      if (name) items.push({ id: id("te"), type: "tool_executed", content: truncate(t.content), toolName: name });
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
// StreamContext — encapsulates all streaming state for one chat() call
// ---------------------------------------------------------------------------

interface DraftPatch {
  content: string;
  statusMessage: string;
  reasoning: string;
  stepItems: SessionStepItem[];
}

class StreamContext {
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
          // Message already captured this reasoning (DeepSeek) — just clear the buffer.
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

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export interface LangGraphAgentOptions {
  config: GluonConfigure;
  name: string;
  description: string;
  skills: Skill[];
  contextLength: number;
  getSystemPrompt: () => Promise<string>;
  commandOptions?: { value: string; label: string }[];
  commandSystemPrompts?: Record<string, () => Promise<string>>;
}

export class LangGraphAgent implements ChatSession {
  private readonly config: GluonConfigure;
  private readonly name: string;
  private readonly description: string;
  private readonly skills: Skill[];
  private readonly contextLength: number;
  private readonly getSystemPrompt: () => Promise<string>;
  private readonly commandOptions: { value: string; label: string }[];
  private readonly commandSystemPrompts: Record<string, () => Promise<string>>;
  private readonly listeners = new Set<SessionStateListener>();
  private state: SessionState = { messages: [], generating: false };
  private messageCounter = 0;
  private messageHistory: BaseMessage[] = [];

  constructor(opts: LangGraphAgentOptions) {
    this.config = opts.config;
    this.name = opts.name;
    this.description = opts.description;
    this.skills = opts.skills;
    this.contextLength = opts.contextLength;
    this.getSystemPrompt = opts.getSystemPrompt;
    this.commandOptions = opts.commandOptions ?? [
      { value: "summary", label: "/summary" },
      { value: "search", label: "/search" },
    ];
    this.commandSystemPrompts = opts.commandSystemPrompts ?? {};
  }

  getName() { return this.name; }
  getDescription() { return this.description; }
  getState() { return this.state; }
  getCommandOptions() { return [...this.commandOptions]; }
  getAgentOptions(): { value: string; label: string }[] { return []; }

  onStateChange(listener: SessionStateListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  clear() {
    this.state = { messages: [], generating: false };
    this.messageHistory = [];
    this.emit();
  }

  async executeCommand(command: string, args: Record<string, unknown> = {}, userInput = ""): Promise<string> {
    const userMessage = userInput || `/${command}${userInput ? ` ${userInput}` : ""}`.trim();
    const tool = this.skills.flatMap((s) => s.getTools()).find((t) => t.name === command);

    if (tool) {
      this.startAssistantTurn(userMessage);
      const selected: SessionStepItem = { id: "cmd_sel", type: "tool_selected", content: truncate(args), toolName: command };
      this.updateDraft({ content: "", statusMessage: `Using ${command}...`, stepItems: [selected] });
      try {
        const result = await tool.invoke(args);
        const output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        const executed: SessionStepItem = { id: "cmd_exec", type: "tool_executed", content: truncate(output), toolName: command };
        this.finishTurn(output, [selected, executed]);
        return output;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.finishTurn(`Error: ${msg}`, [selected]);
        return `Error: ${msg}`;
      }
    }

    if (command === "research") resetResearchSession();
    const prompt = this.commandToPrompt(command, userInput);
    if (!prompt) {
      const names = this.skills.flatMap((s) => s.getTools()).map((t) => t.name).join(", ");
      const fallback = `Tool "${command}" not found. Available: ${names}`;
      this.startAssistantTurn(userMessage);
      this.finishTurn(fallback);
      return fallback;
    }
    return this.chat(prompt, this.commandSystemPrompts[command]);
  }

  async executeCommandWithUserInput(command: string, userInput = ""): Promise<string> {
    return this.executeCommand(command, { userInput }, userInput);
  }

  async chat(userInput: string, systemPromptOverride?: () => Promise<string>): Promise<string> {
    this.startAssistantTurn(userInput);

    const graph = buildAgentGraph({
      llm: createChatModel(this.config),
      tools: this.skills.flatMap((s) => s.getTools()),
      getSystemPrompt: systemPromptOverride ?? this.getSystemPrompt,
    });

    const messages = this.trimHistory([...this.messageHistory, new HumanMessage(userInput)]);
    const ctx = new StreamContext(messages.length);

    try {
      const stream = await graph.stream({ messages }, { streamMode: ["messages", "values"] });

      for await (const chunk of stream) {
        if (!Array.isArray(chunk) || chunk.length < 2) continue;
        const [mode, payload] = chunk as [string, unknown];
        if (mode === "messages") ctx.handleChunk(payload);
        else if (mode === "values") ctx.handleValues((payload as { messages?: BaseMessage[] })?.messages ?? []);
        this.updateDraft(ctx.draft());
      }

      const { content, stepItems } = ctx.finalize();
      this.finishTurn(content, stepItems);
      this.messageHistory = this.trimHistory(ctx.lastValues?.length ? ctx.lastValues : [...messages, new AIMessage(content)]);
      return content;
    } catch (err) {
      const { content, stepItems } = ctx.finalize();
      const isChunkErr = /INCOMPLETE_CHUNKED|incomplete.*chunk|stream.*closed/i.test(
        err instanceof Error ? err.message : String(err),
      );
      this.finishTurn(content, stepItems);
      if (content && isChunkErr) {
        this.messageHistory = this.trimHistory(ctx.lastValues?.length ? ctx.lastValues : [...messages, new AIMessage(content)]);
        return content;
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private commandToPrompt(command: string, userInput: string): string | null {
    const map: Record<string, string> = {
      summary: `Summarize this webpage. ${userInput ? `User request: ${userInput}` : ""}`.trim(),
      search: userInput ? `Search the web for: ${userInput}` : "Search the web for the user's topic.",
      research: userInput ? `Research the following topic thoroughly: ${userInput}` : "Research the topic the user is interested in.",
    };
    return map[command] ?? null;
  }

  private trimHistory(msgs: BaseMessage[]): BaseMessage[] {
    if (this.contextLength <= 0) return [];
    return msgs.slice(-(this.contextLength * 2 + 2));
  }

  private lastAssistantIdx(): number {
    const msgs = this.state.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant") return i;
    }
    return -1;
  }

  private startAssistantTurn(userInput: string) {
    this.state = {
      messages: [
        ...this.state.messages,
        { id: this.nextId(), role: "user", content: userInput },
        { id: this.nextId(), role: "assistant", content: "", name: this.name, loading: true, statusMessage: "Thinking...", reasoning: "", stepItems: [] },
      ],
      generating: true,
    };
    this.emit();
  }

  private updateDraft(patch: Partial<Pick<SessionMessage, "content" | "statusMessage" | "reasoning" | "stepItems">>) {
    const idx = this.lastAssistantIdx();
    if (idx < 0) return;
    const msgs = [...this.state.messages];
    msgs[idx] = { ...msgs[idx], ...patch, loading: true };
    this.state = { ...this.state, messages: msgs };
    this.emit();
  }

  private finishTurn(content: string, stepItems?: SessionStepItem[]) {
    const idx = this.lastAssistantIdx();
    if (idx < 0) return;
    const msgs = [...this.state.messages];
    msgs[idx] = {
      ...msgs[idx],
      content,
      loading: false,
      statusMessage: undefined,
      reasoning: stepItems?.length ? undefined : msgs[idx].reasoning,
      stepItems: stepItems ?? msgs[idx].stepItems,
    };
    this.state = { messages: msgs, generating: false };
    this.emit();
  }

  private emit() {
    for (const l of this.listeners) l(this.state);
  }

  private nextId() {
    return `msg_${++this.messageCounter}`;
  }
}
