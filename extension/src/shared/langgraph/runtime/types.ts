export type SessionRole = "assistant" | "user" | "system";

export interface SessionMessage {
  id: string;
  role: SessionRole;
  content: string;
  name?: string;
  loading?: boolean;
  /** Shown while loading so the user knows the AI is working (e.g. "Thinking...", "Searching..."). */
  statusMessage?: string;
  /** Model reasoning/thinking stream (e.g. from delta.reasoning); shown in a distinct format. */
  reasoning?: string;
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
  getCommandOptions?(): { value: string; label: string }[];
  getAgentOptions?(): { value: string; label: string }[];
}
