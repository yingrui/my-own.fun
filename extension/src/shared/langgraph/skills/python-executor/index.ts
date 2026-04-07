/**
 * Python executor skill — run inline code or an existing workspace script
 * via the backend API. Two tools keep OpenAI/DeepSeek JSON schemas valid (no Zod .refine()).
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { toolsExecutePython } from "@src/shared/services/backendApi";
import type { Skill } from "../types";
import instructions from "./SKILL.md?raw";

function formatExecuteResult(
  result: Awaited<ReturnType<typeof toolsExecutePython>>,
  ranFile?: boolean
): string {
  const parts: string[] = [];
  if (result.script_path) {
    parts.push(ranFile ? `Ran: ${result.script_path}` : `Script path: ${result.script_path}`);
  }
  if (result.stdout) parts.push(`stdout:\n${result.stdout}`);
  if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
  parts.push(`exit_code: ${result.exit_code}`);
  parts.push(`elapsed: ${result.elapsed_ms}ms`);
  if (result.timed_out) parts.push("(timed out)");
  return parts.join("\n\n");
}

export const pythonExecutorSkill: Skill = {
  id: "python-executor",
  name: "Python Executor",
  description:
    "Generate and execute Python scripts on the host machine. Use for data analysis, automation, computation, and file processing.",
  instructions,

  getTools() {
    return [
      tool(
        async ({ code, timeout }: { code: string; timeout?: number }) => {
          try {
            const result = await toolsExecutePython({ code, timeout });
            return formatExecuteResult(result);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
        {
          name: "execute_python",
          description:
            "Run inline Python once (not saved to disk). Use print() for output. To persist and re-run, use write_file then run_python_file.",
          schema: z.object({
            code: z.string().describe("Complete Python source to execute"),
            timeout: z
              .number()
              .optional()
              .describe("Timeout in seconds (default: 30, max: 120)"),
          }),
        },
      ),
      tool(
        async ({ script_path, timeout }: { script_path: string; timeout?: number }) => {
          try {
            const result = await toolsExecutePython({
              scriptPath: script_path.trim(),
              timeout,
            });
            return formatExecuteResult(result, true);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
        {
          name: "run_python_file",
          description:
            "Run an existing .py file in the agent workspace (relative path). Create or update it with write_file first.",
          schema: z.object({
            script_path: z
              .string()
              .describe("Workspace-relative path, e.g. analysis.py"),
            timeout: z
              .number()
              .optional()
              .describe("Timeout in seconds (default: 30, max: 120)"),
          }),
        },
      ),
    ];
  },
};
