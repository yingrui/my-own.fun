import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import { createChatModel } from "@src/shared/langgraph/ModelAdapter";
import { buildAgentGraph } from "@src/shared/langgraph/agentGraph";
import type { Skill } from "@src/shared/langgraph/skills";
import { resetResearchSession } from "@src/shared/langgraph/skills/research";
import type {
  ChatSession,
  SessionMessage,
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

/** True if the message is from the model (AI), so we don't show user input as assistant draft from "values" stream. */
function isAIMessage(msg: unknown): boolean {
  if (msg instanceof AIMessage) return true;
  const m = msg as { getType?: () => string; _getType?: () => string };
  return m?.getType?.() === "ai" || m?._getType?.() === "ai";
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
      try {
        const result = await tool.invoke(args);
        const output = stringifyResult(result);
        this.finishAssistantTurn(output);
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.finishAssistantTurn(`Error: ${message}`);
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
    let lastStreamed = "";
    let accumulated = "";
    let finalValuesMessages: BaseMessage[] | null = null;

    try {
      const stream = await graph.stream(
        { messages },
        { streamMode: ["messages", "values"] },
      );

      for await (const chunk of stream) {
        // Multi-mode streams yield [modeName, payload] tuples
        if (!Array.isArray(chunk) || chunk.length < 2) continue;
        const [mode, payload] = chunk as [string, unknown];

        if (mode === "messages") {
          // payload is [AIMessageChunk, metadata]
          const tuple = payload as [{ content?: unknown }, unknown];
          if (!Array.isArray(tuple)) continue;
          const [messageChunk] = tuple;
          const token = toText(messageChunk?.content);
          if (token) {
            accumulated += token;
            lastStreamed = accumulated;
            this.updateAssistantDraft(lastStreamed);
          }
        } else if (mode === "values") {
          // payload is full graph state { messages: BaseMessage[] }
          const valueState = payload as { messages?: BaseMessage[] };
          const valueMessages = valueState?.messages ?? [];
          if (valueMessages.length > 0) {
            finalValuesMessages = valueMessages;
            const last = valueMessages[valueMessages.length - 1];
            // Only use content when the last message is from the model; otherwise we'd show user input as assistant reply
            if (isAIMessage(last)) {
              const text = toText((last as { content?: unknown })?.content);
              if (text) {
                lastStreamed = text;
                this.updateAssistantDraft(lastStreamed);
              }
            }
          }
        }
      }

      const output = lastStreamed || accumulated || "(No response)";
      this.finishAssistantTurn(output);
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
        this.finishAssistantTurn(partial);
        if (finalValuesMessages?.length) {
          this.messageHistory = this.trimHistory(finalValuesMessages);
        } else {
          this.messageHistory = this.trimHistory([...messages, new AIMessage(partial)]);
        }
        return partial;
      }

      // Don't show error text in the message bubble; finish with partial only and rethrow so UI can show error elsewhere (e.g. toast).
      this.finishAssistantTurn(partial || "");
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
    };
    this.state = {
      messages: [...this.state.messages, userMessage, assistantMessage],
      generating: true,
    };
    this.emit();
  }

  private updateAssistantDraft(content: string): void {
    const messages = [...this.state.messages];
    const idx = [...messages].reverse().findIndex((m) => m.role === "assistant");
    if (idx < 0) return;
    const realIdx = messages.length - 1 - idx;
    messages[realIdx] = { ...messages[realIdx], content, loading: true };
    this.state = { ...this.state, messages };
    this.emit();
  }

  private finishAssistantTurn(content: string): void {
    const messages = [...this.state.messages];
    const idx = [...messages].reverse().findIndex((m) => m.role === "assistant");
    if (idx >= 0) {
      const realIdx = messages.length - 1 - idx;
      messages[realIdx] = {
        ...messages[realIdx],
        content,
        loading: false,
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
