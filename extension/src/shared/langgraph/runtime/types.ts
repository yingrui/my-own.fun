export type SessionRole = "assistant" | "user" | "system";

export interface SessionToolEvent {
  name: string;
  status: "selected" | "executed";
  details?: string;
}

export interface SessionReasoningStep {
  id: string;
  title: string;
  content: string;
}

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
  /** Append-only reasoning snapshots for each step in the run. */
  reasoningSteps?: SessionReasoningStep[];
  /** Tool activity shown in the assistant bubble (selected/executed). */
  toolEvents?: SessionToolEvent[];
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
