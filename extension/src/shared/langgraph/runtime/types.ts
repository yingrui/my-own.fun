export type SessionRole = "assistant" | "user" | "system";

export type StepItemType = "reasoning" | "tool_selected" | "tool_executed" | "content";

export interface SessionStepItem {
  id: string;
  type: StepItemType;
  content: string;
  toolName?: string;
}

export interface SessionMessage {
  id: string;
  role: SessionRole;
  content: string;
  name?: string;
  loading?: boolean;
  /** Shown while loading so the user knows the AI is working (e.g. "Thinking...", "Searching..."). */
  statusMessage?: string;
  /** Live streaming reasoning buffer for the current in-progress step. */
  reasoning?: string;
  /** Ordered timeline of completed step items (reasoning, tool calls, intermediate content). */
  stepItems?: SessionStepItem[];
}

export interface SessionState {
  messages: SessionMessage[];
  generating: boolean;
}

export type SessionStateListener = (state: SessionState) => void;

export interface ChatSession {
  getName(): string;
  getDescription(): string;
  getState(): SessionState;
  onStateChange(listener: SessionStateListener): () => void;
  chat(
    userInput: string,
    systemPromptOverride?: () => Promise<string>,
  ): Promise<string>;
  executeCommand(
    command: string,
    args?: Record<string, unknown>,
    userInput?: string,
  ): Promise<string>;
  executeCommandWithUserInput?(command: string, userInput?: string): Promise<string>;
  clear(): void;
  removeLastTurn?(): void;
  loadConversation?(messages: SessionMessage[]): void;
  getCommandOptions?(): { value: string; label: string }[];
  getAgentOptions?(): { value: string; label: string }[];
}
