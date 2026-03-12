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

function parseMessagePayload(payload: unknown): { content: string; reasoning: string } {
  let content = "";
  let reasoning = "";
  if (Array.isArray(payload)) {
    const [chunk] = payload as [unknown, unknown];
    const c = chunk as Record<string, unknown>;
    content = toText(c?.content);
    reasoning = toReasoning(chunk);
    if (!reasoning && c?.additional_kwargs && typeof c.additional_kwargs === "object") {
      const kw = c.additional_kwargs as Record<string, unknown>;
      reasoning = toText(kw.reasoning ?? kw.reasoning_content);
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

/**
 * Extract non-reasoning step items from messages (tool_selected, tool_executed, intermediate content).
 * Reasoning is managed separately via the streaming buffer so it doesn't get lost on rebuilds.
 */
function extractMessageItems(currentRunMessages: BaseMessage[], startId: number): SessionStepItem[] {
  const items: SessionStepItem[] = [];
  let idCounter = startId;
  const nextId = () => `msg_step_${++idCounter}`;

  for (const message of currentRunMessages) {
    const type = getMessageType(message);

    if (type === "ai") {
      const ai = message as {
        content?: unknown;
        tool_calls?: Array<{ name?: string; args?: unknown }>;
        additional_kwargs?: {
          reasoning_content?: string;
          tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
        };
      };

      const reasoningContent = ai.additional_kwargs?.reasoning_content ?? "";
      if (reasoningContent) {
        items.push({ id: nextId(), type: "reasoning", content: reasoningContent });
      }

      const aiContent = toText(ai.content);
      const directCalls = Array.isArray(ai.tool_calls) ? ai.tool_calls : [];
      const rawCalls = Array.isArray(ai.additional_kwargs?.tool_calls) ? ai.additional_kwargs?.tool_calls : [];
      const hasToolCalls = directCalls.length > 0 || rawCalls.length > 0;

      if (aiContent && hasToolCalls) {
        items.push({ id: nextId(), type: "content", content: aiContent });
      }

      if (directCalls.length > 0) {
        for (const call of directCalls) {
          const toolName = normalizeToolName(call.name);
          if (!toolName) continue;
          items.push({
            id: nextId(),
            type: "tool_selected",
            content: toShortDetails(call.args) ?? "",
            toolName,
          });
        }
      } else {
        for (const call of rawCalls) {
          const toolName = normalizeToolName(call?.function?.name);
          if (!toolName) continue;
          items.push({
            id: nextId(),
            type: "tool_selected",
            content: toShortDetails(call?.function?.arguments) ?? "",
            toolName,
          });
        }
      }
    }

    if (type === "tool") {
      const tool = message as { name?: string; content?: unknown };
      const toolName = normalizeToolName(tool.name);
      if (!toolName) continue;
      items.push({
        id: nextId(),
        type: "tool_executed",
        content: toShortDetails(tool.content) ?? "",
        toolName,
      });
    }
  }

  return items;
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
  for (let i = messages.length - 1; i >= 0; i--) {
    if (getMessageType(messages[i]) === "tool") {
      return "Writing...";
    }
  }
  return undefined;
}

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
      const selectedItem: SessionStepItem = {
        id: "cmd_selected",
        type: "tool_selected",
        content: toShortDetails(args) ?? "",
        toolName: command,
      };
      this.updateAssistantDraft("", `Using ${command}...`, undefined, [selectedItem]);
      try {
        const result = await tool.invoke(args);
        const output = stringifyResult(result);
        const executedItem: SessionStepItem = {
          id: "cmd_executed",
          type: "tool_executed",
          content: toShortDetails(output) ?? "",
          toolName: command,
        };
        this.finishAssistantTurn(output, undefined, [selectedItem, executedItem]);
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.finishAssistantTurn(`Error: ${message}`, undefined, [selectedItem]);
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
    let stepItems: SessionStepItem[] = [];
    let stepIdCounter = 0;
    let prevMessageItemCount = 0;
    let finalValuesMessages: BaseMessage[] | null = null;
    let chunkCount = 0;

    try {
      const stream = await graph.stream(
        { messages },
        { streamMode: ["messages", "values"] },
      );

      for await (const chunk of stream) {
        if (!Array.isArray(chunk) || chunk.length < 2) continue;
        const [mode, payload] = chunk as [string, unknown];
        chunkCount += 1;

        if (mode === "messages") {
          const tuple = payload as [unknown, unknown];
          const msgChunk = Array.isArray(tuple) ? tuple[0] : payload;
          const chunkType = getMessageType(msgChunk);
          if (chunkType && chunkType !== "ai") {
            if (chunkCount > 0) {
              this.updateAssistantDraft(
                lastStreamed || accumulated, "Working...", accumulatedReasoning, stepItems,
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
            this.updateAssistantDraft(lastStreamed, "Writing...", accumulatedReasoning, stepItems);
          } else if (accumulatedReasoning) {
            this.updateAssistantDraft(
              lastStreamed || accumulated, "Thinking...", accumulatedReasoning, stepItems,
            );
          } else if (chunkCount > 0) {
            this.updateAssistantDraft(
              lastStreamed || accumulated, "Working...", accumulatedReasoning, stepItems,
            );
          }
        } else if (mode === "values") {
          const valueState = payload as { messages?: BaseMessage[] };
          const valueMessages = valueState?.messages ?? [];
          if (valueMessages.length > 0) {
            finalValuesMessages = valueMessages;
            const currentRunMessages = valueMessages.slice(inputMessageCount);
            const newMessageItems = extractMessageItems(currentRunMessages, stepIdCounter);

            if (newMessageItems.length > prevMessageItemCount) {
              // Snapshot pending reasoning before appending new tool/content items
              if (accumulatedReasoning.trim()) {
                const alreadyHasReasoning = newMessageItems.length > prevMessageItemCount
                  && newMessageItems[prevMessageItemCount]?.type === "reasoning";
                if (!alreadyHasReasoning) {
                  stepIdCounter += 1;
                  stepItems = [
                    ...stepItems,
                    { id: `reasoning_${stepIdCounter}`, type: "reasoning", content: accumulatedReasoning.trim() },
                  ];
                }
                accumulatedReasoning = "";
              }
              // Append only the new items from messages
              const newItems = newMessageItems.slice(prevMessageItemCount);
              stepItems = [...stepItems, ...newItems];
              stepIdCounter += newItems.length;
              prevMessageItemCount = newMessageItems.length;
            }

            const toolStatus = getToolStatusMessage(
              currentRunMessages.length > 0 ? currentRunMessages : valueMessages,
            );
            const last = valueMessages[valueMessages.length - 1];
            const currentContent = lastStreamed || accumulated;
            const statusMessage =
              toolStatus ?? (valueMessages.length > 1 || chunkCount > 0 ? "Working..." : undefined);
            if (isAIMessage(last)) {
              const text = toText((last as { content?: unknown })?.content);
              if (text) {
                lastStreamed = text;
                this.updateAssistantDraft(
                  lastStreamed, statusMessage ?? "Writing...", accumulatedReasoning, stepItems,
                );
              } else {
                this.updateAssistantDraft(
                  currentContent, statusMessage, accumulatedReasoning, stepItems,
                );
              }
            } else {
              this.updateAssistantDraft(
                currentContent, statusMessage, accumulatedReasoning, stepItems,
              );
            }
          }
        }
      }

      if (accumulatedReasoning.trim()) {
        stepIdCounter += 1;
        stepItems = [
          ...stepItems,
          { id: `reasoning_${stepIdCounter}`, type: "reasoning", content: accumulatedReasoning.trim() },
        ];
      }

      const output = lastStreamed || accumulated || "(No response)";
      this.finishAssistantTurn(output, undefined, stepItems);
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

      if (partial && isIncompleteChunkedEncoding) {
        if (accumulatedReasoning.trim()) {
          stepIdCounter += 1;
          stepItems = [...stepItems, { id: `reasoning_${stepIdCounter}`, type: "reasoning", content: accumulatedReasoning.trim() }];
        }
        this.finishAssistantTurn(partial, undefined, stepItems);
        if (finalValuesMessages?.length) {
          this.messageHistory = this.trimHistory(finalValuesMessages);
        } else {
          this.messageHistory = this.trimHistory([...messages, new AIMessage(partial)]);
        }
        return partial;
      }

      if (accumulatedReasoning.trim()) {
        stepIdCounter += 1;
        stepItems = [...stepItems, { id: `reasoning_${stepIdCounter}`, type: "reasoning", content: accumulatedReasoning.trim() }];
      }
      this.finishAssistantTurn(partial || "", undefined, stepItems);
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
      stepItems: [],
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
    stepItems?: SessionStepItem[],
  ): void {
    const messages = [...this.state.messages];
    const idx = [...messages].reverse().findIndex((m) => m.role === "assistant");
    if (idx < 0) return;
    const realIdx = messages.length - 1 - idx;
    const next = { ...messages[realIdx], content, loading: true };
    if (statusMessage !== undefined) next.statusMessage = statusMessage;
    if (reasoning !== undefined) next.reasoning = reasoning;
    if (stepItems !== undefined) next.stepItems = stepItems;
    messages[realIdx] = next;
    this.state = { ...this.state, messages };
    this.emit();
  }

  private finishAssistantTurn(
    content: string,
    reasoning?: string,
    stepItems?: SessionStepItem[],
  ): void {
    const messages = [...this.state.messages];
    const idx = [...messages].reverse().findIndex((m) => m.role === "assistant");
    if (idx >= 0) {
      const realIdx = messages.length - 1 - idx;
      messages[realIdx] = {
        ...messages[realIdx],
        content,
        loading: false,
        statusMessage: undefined,
        reasoning: stepItems?.length ? undefined : (reasoning ?? messages[realIdx].reasoning),
        stepItems: stepItems !== undefined ? stepItems : messages[realIdx].stepItems,
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
