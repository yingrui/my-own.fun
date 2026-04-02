/**
 * React context that provides code execution capabilities to CodeBlock components.
 * When the context is provided (super agent enabled), code blocks for Python and
 * shell languages show a "Run" button.
 */

import { createContext, useContext } from "react";

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  elapsed_ms: number;
  timed_out: boolean;
}

export interface CodeExecutionContextValue {
  executePython: (code: string) => Promise<CodeExecutionResult>;
  executeShell: (command: string) => Promise<CodeExecutionResult>;
}

export const CodeExecutionContext = createContext<CodeExecutionContextValue | null>(null);

export function useCodeExecution(): CodeExecutionContextValue | null {
  return useContext(CodeExecutionContext);
}
