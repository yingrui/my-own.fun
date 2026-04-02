/**
 * Python executor skill — generate and run Python scripts on the host
 * via the backend API.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { toolsExecutePython } from "@src/shared/services/backendApi";
import type { Skill } from "../types";
import instructions from "./SKILL.md?raw";

export const pythonExecutorSkill: Skill = {
  id: "python-executor",
  name: "Python Executor",
  description:
    "Generate and execute Python scripts on the host machine. Use for data analysis, automation, computation, and file processing.",
  instructions,

  getTools() {
    return [
      tool(
        async ({
          code,
          timeout,
          save_as,
        }: {
          code: string;
          timeout?: number;
          save_as?: string;
        }) => {
          try {
            const result = await toolsExecutePython(code, {
              timeout,
              saveAs: save_as,
            });
            const parts: string[] = [];
            if (result.script_path) parts.push(`Script saved: ${result.script_path}`);
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
          name: "execute_python",
          description:
            "Execute a Python script on the host machine. Write complete, self-contained Python code. Use print() for output. Optionally save the script to a file with save_as.",
          schema: z.object({
            code: z.string().describe("The Python source code to execute"),
            timeout: z
              .number()
              .optional()
              .describe("Timeout in seconds (default: 30, max: 120)"),
            save_as: z
              .string()
              .optional()
              .describe(
                "Optional filename to save the script in the workspace (e.g. 'analysis.py')"
              ),
          }),
        },
      ),
    ];
  },
};
