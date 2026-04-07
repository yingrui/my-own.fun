/**
 * Terminal skill — execute shell commands on the host via the backend API.
 */

import { tool } from "@langchain/core/tools";
import type { JSONSchema } from "@langchain/core/utils/json_schema";
import { toolsExecuteCommand } from "@src/shared/services/backendApi";
import type { Skill } from "../types";
import instructions from "./SKILL.md?raw";

/** Explicit schema so OpenAI/DeepSeek only require `command` (Zod optional was emitted as required). */
const runCommandSchema: JSONSchema = {
  type: "object",
  properties: {
    command: { type: "string", description: "The shell command to execute" },
    cwd: {
      type: "string",
      description:
        "Optional. Working directory relative to agent workspace root. Omit for workspace root.",
    },
    timeout: {
      type: "number",
      description: "Optional. Timeout in seconds (default: 30, max: 120).",
    },
  },
  required: ["command"],
  additionalProperties: false,
};

export const terminalSkill: Skill = {
  id: "terminal",
  name: "Terminal",
  description:
    "Execute shell commands on the host machine and capture stdout/stderr output.",
  instructions,

  getTools() {
    return [
      tool(
        async (input: { command: string; cwd?: string; timeout?: number }) => {
          const { command, cwd, timeout } = input;
          try {
            const result = await toolsExecuteCommand(command, { cwd, timeout });
            const parts: string[] = [];
            if (result.stdout) parts.push(`stdout:\n${result.stdout}`);
            if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
            parts.push(`exit_code: ${result.exit_code}`);
            parts.push(`elapsed: ${result.elapsed_ms}ms`);
            if (result.timed_out) parts.push("(timed out)");
            return parts.join("\n\n");
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
        {
          name: "run_command",
          description:
            "Execute a shell command in the agent workspace. Returns stdout, stderr, and exit code. Use for git operations, package management, file manipulation, and other CLI tasks.",
          schema: runCommandSchema,
        },
      ),
    ];
  },
};
