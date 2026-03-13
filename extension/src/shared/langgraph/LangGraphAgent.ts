import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import { createChatModel } from "@src/shared/langgraph/ModelAdapter";
import { buildAgentGraph } from "@src/shared/langgraph/agentGraph";
import { type Skill, resetResearchSession } from "@src/shared/langgraph/skills";
import { StreamContext } from "@src/shared/langgraph/StreamContext";
import type {
  ChatSession,
  SessionMessage,
  SessionStepItem,
  SessionState,
  SessionStateListener,
} from "@src/shared/langgraph/runtime/types";

function truncate(value: unknown, max = 140): string {
  if (value == null) return "";
  const text = (typeof value === "string" ? value : JSON.stringify(value)).trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
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
      skills: this.skills,
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
