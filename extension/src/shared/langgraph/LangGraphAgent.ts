import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import { createChatModel } from "@src/shared/langgraph/ModelAdapter";
import { buildAgentGraph } from "@src/shared/langgraph/agentGraph";
import type { Skill } from "@src/shared/langgraph/skills";
import { resetResearchSession } from "@src/shared/langgraph/skills/research";
import type {
  ChatSession,
  SessionMessage,
  SessionReasoningStep,
  SessionState,
  SessionStateListener,
  SessionToolEvent,
} from "@src/shared/langgraph/runtime/types";

function toText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : (part as { text?: string })?.text ?? ""))
      .join("");
  }
  return "";
}

/** Extract reasoning from a message chunk (e.g. delta.reasoning or additional_kwargs.reasoning). */
function toReasoning(chunk: unknown): string {
  if (chunk == null) return "";
  const c = chunk as {
    reasoning?: unknown;
    reasoning_content?: unknown;
    additional_kwargs?: { reasoning?: unknown; reasoning_content?: unknown };
  };
  const raw = c.reasoning ?? c.reasoning_content ?? c.additional_kwargs?.reasoning ?? c.additional_kwargs?.reasoning_content;
  return toText(raw);
}

/** Extract content and reasoning from a "messages" payload.
 *  With __includeRawResponse, reasoning lives in additional_kwargs.__raw_response.choices[0].delta.reasoning */
function parseMessagePayload(payload: unknown): { content: string; reasoning: string } {
  let content = "";
  let reasoning = "";
  if (Array.isArray(payload)) {
    const [chunk] = payload as [unknown, unknown];
    const c = chunk as Record<string, unknown>;
    content = toText(c?.content);

    // 1) Try direct properties (future LangChain versions may forward reasoning)
    reasoning = toReasoning(chunk);

    // 2) Try additional_kwargs.reasoning / reasoning_content
    if (!reasoning && c?.additional_kwargs && typeof c.additional_kwargs === "object") {
      const kw = c.additional_kwargs as Record<string, unknown>;
      reasoning = toText(kw.reasoning ?? kw.reasoning_content);

      // 3) Try raw response: additional_kwargs.__raw_response.choices[0].delta.reasoning
      if (!reasoning && kw.__raw_response && typeof kw.__raw_response === "object") {
        const raw = kw.__raw_response as { choices?: Array<{ delta?: Record<string, unknown> }> };
        const delta = raw.choices?.[0]?.delta;
        if (delta) {
          reasoning = toText(delta.reasoning ?? delta.reasoning_content);
        }
      }
    }
  }
  return { content, reasoning };
}

/** Returns a short status label when the last message in state is a tool message (e.g. "Searching the web..."). */
function getMessageType(m: unknown): string {
  const msg = m as { getType?: () => string; _getType?: () => string; type?: string; lc_id?: string[] };
  return msg?.getType?.() ?? msg?._getType?.() ?? msg?.type ?? msg?.lc_id?.[2] ?? "";
}

function normalizeToolName(name?: string): string {
  return (name ?? "").trim();
}

function toShortDetails(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const normalized = text.trim();
  if (!normalized) return undefined;
  return normalized.length > 140 ? `${normalized.slice(0, 140)}...` : normalized;
}

function collectToolEvents(messages: BaseMessage[]): SessionToolEvent[] {
  const events: SessionToolEvent[] = [];
  for (const message of messages) {
    const type = getMessageType(message);
    if (type === "ai") {
      const ai = message as { tool_calls?: Array<{ name?: string; args?: unknown }>; additional_kwargs?: { tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } };
      const directCalls = Array.isArray(ai.tool_calls) ? ai.tool_calls : [];
      const rawCalls = Array.isArray(ai.additional_kwargs?.tool_calls) ? ai.additional_kwargs?.tool_calls : [];
      // Use only one source to avoid duplicate "Selected" for the same call (both are often populated).
      if (directCalls.length > 0) {
        for (const call of directCalls) {
          const toolName = normalizeToolName(call.name);
          if (!toolName) continue;
          events.push({
            name: toolName,
            status: "selected",
            details: toShortDetails(call.args),
          });
        }
      } else {
        for (const call of rawCalls) {
          const toolName = normalizeToolName(call?.function?.name);
          if (!toolName) continue;
          events.push({
            name: toolName,
            status: "selected",
            details: toShortDetails(call?.function?.arguments),
          });
        }
      }
    }
    if (type === "tool") {
      const tool = message as { name?: string; content?: unknown };
      const toolName = normalizeToolName(tool.name);
      if (!toolName) continue;
      events.push({
        name: toolName,
        status: "executed",
        details: toShortDetails(tool.content),
      });
    }
  }
  const seen = new Set<string>();
  const deduped: SessionToolEvent[] = [];
  for (const event of events) {
    const key = `${event.status}::${event.name}::${event.details ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(event);
  }
  return deduped;
}

function makeReasoningStep(
  stepIndex: number,
  content: string,
  trigger?: SessionToolEvent,
): SessionReasoningStep {
  const trimmed = content.trim();
  const title = trigger
    ? `Step ${stepIndex}: ${trigger.status === "selected" ? "Select" : "Execute"} ${trigger.name}`
    : `Step ${stepIndex}: Final reasoning`;
  return {
    id: `reasoning_step_${stepIndex}`,
    title,
    content: trimmed,
  };
}

function getToolStatusMessage(messages: BaseMessage[]): string | undefined {
  if (messages.length === 0) return undefined;
  const last = messages[messages.length - 1];
  const lastType = getMessageType(last);
  if (lastType === "tool") {
    const name = (last as { name?: string }).name ?? "";
    const labels: Record<string, string> = {
      search: "Searching the web...",
      web_search: "Searching the web...",
      open_url_and_get_content: "Reading the page...",
      page_content: "Reading the page...",
      get_page_content: "Reading the page...",
      research: "Researching...",
      summary: "Summarizing...",
    };
    return labels[name] ?? (name ? `Using ${name}...` : "Working...");
  }
  // If last is AI but we have a tool message earlier, show "Writing..." (model is replying after tools)
  for (let i = messages.length - 1; i >= 0; i--) {
    if (getMessageType(messages[i]) === "tool") {
      return "Writing...";
    }
  }
  return undefined;
}

/** True if the message is from the model (AI), so we don't show user input as assistant draft from "values" stream. */
function isAIMessage(msg: unknown): boolean {
  if (msg instanceof AIMessage) return true;
  const m = msg as { getType?: () => string; _getType?: () => string; type?: string };
  return m?.getType?.() === "ai" || m?._getType?.() === "ai" || m?.type === "ai";
}

function stringifyResult(result: unknown): string {
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

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

  constructor(options: LangGraphAgentOptions) {
    this.config = options.config;
    this.name = options.name;
    this.description = options.description;
    this.skills = options.skills;
    this.contextLength = options.contextLength;
    this.getSystemPrompt = options.getSystemPrompt;
    this.commandOptions =
      options.commandOptions ?? [
        { value: "summary", label: "/summary" },
        { value: "search", label: "/search" },
      ];
    this.commandSystemPrompts = options.commandSystemPrompts ?? {};
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getState(): SessionState {
    return this.state;
  }

  onStateChange(listener: SessionStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCommandOptions(): { value: string; label: string }[] {
    return [...this.commandOptions];
  }

  getAgentOptions(): { value: string; label: string }[] {
    return [];
  }

  clear(): void {
    this.state = { messages: [], generating: false };
    this.messageHistory = [];
    this.emit();
  }

  async executeCommand(
    command: string,
    args: Record<string, unknown> = {},
    userInput: string = "",
  ): Promise<string> {
    const label = `/${command}${userInput ? ` ${userInput}` : ""}`.trim();
    const userMessage = userInput || label;
    const tool = this.skills.flatMap((s) => s.getTools()).find((t) => t.name === command);
    if (tool) {
      this.startAssistantTurn(userMessage);
      const selectedEvent: SessionToolEvent = {
        name: command,
        status: "selected",
        details: toShortDetails(args),
      };
      this.updateAssistantDraft("", `Using ${command}...`, undefined, [selectedEvent]);
      try {
        const result = await tool.invoke(args);
        const output = stringifyResult(result);
        const executedEvent: SessionToolEvent = {
          name: command,
          status: "executed",
          details: toShortDetails(output),
        };
        this.finishAssistantTurn(output, undefined, [selectedEvent, executedEvent]);
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.finishAssistantTurn(`Error: ${message}`, undefined, [selectedEvent]);
        return `Error: ${message}`;
      }
    }

    if (command === "research") {
      resetResearchSession();
    }
    const prompt = this.commandToPrompt(command, userInput);
    if (!prompt) {
      const available = this.skills
        .flatMap((s) => s.getTools())
        .map((t) => t.name)
        .join(", ");
      const fallback = `Tool "${command}" not found. Available: ${available}`;
      this.startAssistantTurn(userMessage);
      this.finishAssistantTurn(fallback);
      return fallback;
    }
    return this.chat(prompt, this.commandSystemPrompts[command]);
  }

  async executeCommandWithUserInput(
    command: string,
    userInput: string = "",
  ): Promise<string> {
    return this.executeCommand(command, { userInput }, userInput);
  }

  async chat(
    userInput: string,
    systemPromptOverride?: () => Promise<string>,
  ): Promise<string> {
    this.startAssistantTurn(userInput);

    const llm = createChatModel(this.config);
    const tools = this.skills.flatMap((s) => s.getTools());
    const graph = buildAgentGraph({
      llm,
      tools,
      getSystemPrompt: systemPromptOverride ?? this.getSystemPrompt,
    });

    const messages = this.trimHistory([...this.messageHistory, new HumanMessage(userInput)]);
    const inputMessageCount = messages.length;
    let lastStreamed = "";
    let accumulated = "";
    let accumulatedReasoning = "";
    let reasoningSteps: SessionReasoningStep[] = [];
    let toolEventCountHandled = 0;
    let toolEvents: SessionToolEvent[] = [];
    let finalValuesMessages: BaseMessage[] | null = null;
    let chunkCount = 0;

    try {
      const stream = await graph.stream(
        { messages },
        { streamMode: ["messages", "values"] },
      );

      for await (const chunk of stream) {
        // Multi-mode streams yield [modeName, payload] tuples
        if (!Array.isArray(chunk) || chunk.length < 2) continue;
        const [mode, payload] = chunk as [string, unknown];
        chunkCount += 1;

        if (mode === "messages") {
          const tuple = payload as [unknown, unknown];
          const msgChunk = Array.isArray(tuple) ? tuple[0] : payload;
          const chunkType = getMessageType(msgChunk);
          // Only assistant text should be appended to the visible reply.
          // Tool/human/system chunks are reflected via values-mode status/events.
          if (chunkType && chunkType !== "ai") {
            if (chunkCount > 0) {
              this.updateAssistantDraft(
                lastStreamed || accumulated,
                "Working...",
                accumulatedReasoning,
                toolEvents,
                reasoningSteps,
              );
            }
            continue;
          }
          const { content: token, reasoning: reasoningToken } = parseMessagePayload(payload);
          if (reasoningToken) {
            accumulatedReasoning += reasoningToken;
          }
          if (token) {
            accumulated += token;
            lastStreamed = accumulated;
            this.updateAssistantDraft(
              lastStreamed,
              "Writing...",
              accumulatedReasoning,
              toolEvents,
              reasoningSteps,
            );
          } else if (accumulatedReasoning) {
            this.updateAssistantDraft(
              lastStreamed || accumulated,
              "Thinking...",
              accumulatedReasoning,
              toolEvents,
              reasoningSteps,
            );
          } else if (chunkCount > 0) {
            this.updateAssistantDraft(
              lastStreamed || accumulated,
              "Working...",
              accumulatedReasoning,
              toolEvents,
              reasoningSteps,
            );
          }
        } else if (mode === "values") {
          // payload is full graph state { messages: BaseMessage[] }
          const valueState = payload as { messages?: BaseMessage[] };
          const valueMessages = valueState?.messages ?? [];
          if (valueMessages.length > 0) {
            finalValuesMessages = valueMessages;
            const currentRunMessages = valueMessages.slice(inputMessageCount);
            toolEvents = collectToolEvents(currentRunMessages);
            if (toolEvents.length > toolEventCountHandled && accumulatedReasoning.trim()) {
              const trigger = toolEvents[toolEvents.length - 1];
              reasoningSteps = [
                ...reasoningSteps,
                makeReasoningStep(reasoningSteps.length + 1, accumulatedReasoning, trigger),
              ];
              accumulatedReasoning = "";
            }
            toolEventCountHandled = toolEvents.length;
            const toolStatus = getToolStatusMessage(
              currentRunMessages.length > 0 ? currentRunMessages : valueMessages,
            );
            const last = valueMessages[valueMessages.length - 1];
            const currentContent = lastStreamed || accumulated;
            // Prefer specific tool status; else "Working..." when graph has more than user message or we've seen any chunk
            const statusMessage =
              toolStatus ?? (valueMessages.length > 1 || chunkCount > 0 ? "Working..." : undefined);
            // Only use content when the last message is from the model; otherwise we'd show user input as assistant reply
            if (isAIMessage(last)) {
              const text = toText((last as { content?: unknown })?.content);
              if (text) {
                lastStreamed = text;
                this.updateAssistantDraft(
                  lastStreamed,
                  statusMessage ?? "Writing...",
                  accumulatedReasoning,
                  toolEvents,
                  reasoningSteps,
                );
              } else {
                this.updateAssistantDraft(
                  currentContent,
                  statusMessage,
                  accumulatedReasoning,
                  toolEvents,
                  reasoningSteps,
                );
              }
            } else {
              this.updateAssistantDraft(
                currentContent,
                statusMessage,
                accumulatedReasoning,
                toolEvents,
                reasoningSteps,
              );
            }
          }
        }
      }

      if (accumulatedReasoning.trim()) {
        reasoningSteps = [
          ...reasoningSteps,
          makeReasoningStep(reasoningSteps.length + 1, accumulatedReasoning),
        ];
      }

      const output = lastStreamed || accumulated || "(No response)";
      this.finishAssistantTurn(output, undefined, toolEvents, reasoningSteps);
      if (finalValuesMessages && finalValuesMessages.length > 0) {
        this.messageHistory = this.trimHistory(finalValuesMessages);
      } else {
        this.messageHistory = this.trimHistory([...messages, new AIMessage(output)]);
      }
      return output;
    } catch (err) {
      const isIncompleteChunkedEncoding = /ERR_INCOMPLETE_CHUNKED_ENCODING|incomplete.*chunk|stream.*closed/i.test(
        err instanceof Error ? err.message : String(err),
      );
      const partial = lastStreamed || accumulated;

      // Server may have sent [DONE] + proper 0\r\n\r\n but browser/SDK still reports incomplete chunked encoding.
      // If we have content, treat as success so the user sees the full response.
      if (partial && isIncompleteChunkedEncoding) {
        if (accumulatedReasoning.trim()) {
          reasoningSteps = [
            ...reasoningSteps,
            makeReasoningStep(reasoningSteps.length + 1, accumulatedReasoning),
          ];
        }
        this.finishAssistantTurn(partial, undefined, toolEvents, reasoningSteps);
        if (finalValuesMessages?.length) {
          this.messageHistory = this.trimHistory(finalValuesMessages);
        } else {
          this.messageHistory = this.trimHistory([...messages, new AIMessage(partial)]);
        }
        return partial;
      }

      // Don't show error text in the message bubble; finish with partial only and rethrow so UI can show error elsewhere (e.g. toast).
      if (accumulatedReasoning.trim()) {
        reasoningSteps = [
          ...reasoningSteps,
          makeReasoningStep(reasoningSteps.length + 1, accumulatedReasoning),
        ];
      }
      this.finishAssistantTurn(partial || "", undefined, toolEvents, reasoningSteps);
      throw err;
    }
  }

  private commandToPrompt(command: string, userInput: string): string | null {
    const prompts: Record<string, string> = {
      summary: `Summarize this webpage. ${userInput ? `User request: ${userInput}` : ""}`.trim(),
      search: userInput ? `Search the web for: ${userInput}` : "Search the web for the user's topic.",
      research: userInput
        ? `Research the following topic thoroughly: ${userInput}`
        : "Research the topic the user is interested in.",
    };
    return prompts[command] ?? null;
  }

  private trimHistory(messages: BaseMessage[]): BaseMessage[] {
    if (this.contextLength <= 0) return [];
    const keep = this.contextLength * 2 + 2;
    return messages.slice(-keep);
  }

  private startAssistantTurn(userInput: string): void {
    const userMessage: SessionMessage = {
      id: this.newMessageId(),
      role: "user",
      content: userInput,
    };
    const assistantMessage: SessionMessage = {
      id: this.newMessageId(),
      role: "assistant",
      content: "",
      name: this.name,
      loading: true,
      statusMessage: "Thinking...",
      reasoning: "",
      reasoningSteps: [],
      toolEvents: [],
    };
    this.state = {
      messages: [...this.state.messages, userMessage, assistantMessage],
      generating: true,
    };
    this.emit();
  }

  private updateAssistantDraft(
    content: string,
    statusMessage?: string,
    reasoning?: string,
    toolEvents?: SessionToolEvent[],
    reasoningSteps?: SessionReasoningStep[],
  ): void {
    const messages = [...this.state.messages];
    const idx = [...messages].reverse().findIndex((m) => m.role === "assistant");
    if (idx < 0) return;
    const realIdx = messages.length - 1 - idx;
    const next = { ...messages[realIdx], content, loading: true };
    if (statusMessage !== undefined) next.statusMessage = statusMessage;
    if (reasoning !== undefined) next.reasoning = reasoning;
    if (toolEvents !== undefined) next.toolEvents = toolEvents;
    if (reasoningSteps !== undefined) next.reasoningSteps = reasoningSteps;
    messages[realIdx] = next;
    this.state = { ...this.state, messages };
    this.emit();
  }

  private finishAssistantTurn(
    content: string,
    reasoning?: string,
    toolEvents?: SessionToolEvent[],
    reasoningSteps?: SessionReasoningStep[],
  ): void {
    const messages = [...this.state.messages];
    const idx = [...messages].reverse().findIndex((m) => m.role === "assistant");
    if (idx >= 0) {
      const realIdx = messages.length - 1 - idx;
      // When we have reasoning steps, don't keep streaming reasoning so "Current step" doesn't duplicate the last step.
      const resolvedReasoning =
        reasoning !== undefined
          ? reasoning
          : reasoningSteps?.length
            ? undefined
            : messages[realIdx].reasoning;
      messages[realIdx] = {
        ...messages[realIdx],
        content,
        loading: false,
        statusMessage: undefined,
        reasoning: resolvedReasoning,
        toolEvents: toolEvents !== undefined ? toolEvents : messages[realIdx].toolEvents,
        reasoningSteps:
          reasoningSteps !== undefined ? reasoningSteps : messages[realIdx].reasoningSteps,
      };
    }
    this.state = { messages, generating: false };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private newMessageId(): string {
    this.messageCounter += 1;
    return `msg_${this.messageCounter}`;
  }
}
