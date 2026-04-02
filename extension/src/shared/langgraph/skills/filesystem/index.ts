/**
 * Filesystem skill — list, read, write, and delete files in the agent workspace
 * via the backend API.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  toolsListDirectory,
  toolsReadFile,
  toolsWriteFile,
  toolsDeleteFile,
} from "@src/shared/services/backendApi";
import type { Skill } from "../types";
import instructions from "./SKILL.md?raw";

export const filesystemSkill: Skill = {
  id: "filesystem",
  name: "Filesystem",
  description:
    "Read, write, list, and delete files in the agent workspace on the host machine.",
  instructions,

  getTools() {
    return [
      tool(
        async ({ path }: { path: string }) => {
          try {
            const result = await toolsListDirectory(path);
            const lines = result.entries.map(
              (e) => `${e.is_dir ? "[DIR] " : "      "}${e.name}${e.is_dir ? "/" : ""} (${e.size} bytes)`
            );
            return `Directory: ${result.path}\n${lines.join("\n") || "(empty)"}`;
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
        {
          name: "list_directory",
          description:
            "List files and sub-directories at the given path inside the agent workspace. Use '.' for the workspace root.",
          schema: z.object({
            path: z
              .string()
              .default(".")
              .describe("Relative path inside the workspace (default: root)"),
          }),
        },
      ),

      tool(
        async ({ path }: { path: string }) => {
          try {
            const result = await toolsReadFile(path);
            return `File: ${result.path} (${result.size} chars)\n---\n${result.content}`;
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
        {
          name: "read_file",
          description:
            "Read the text content of a file in the agent workspace. Returns the full file content.",
          schema: z.object({
            path: z.string().describe("Relative path to the file"),
          }),
        },
      ),

      tool(
        async ({ path, content }: { path: string; content: string }) => {
          try {
            const result = await toolsWriteFile(path, content);
            return `Written: ${result.path} (${result.size} chars)`;
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
        {
          name: "write_file",
          description:
            "Write (create or overwrite) a text file in the agent workspace. Parent directories are created automatically.",
          schema: z.object({
            path: z.string().describe("Relative path for the file"),
            content: z.string().describe("Text content to write"),
          }),
        },
      ),

      tool(
        async ({ path }: { path: string }) => {
          try {
            const result = await toolsDeleteFile(path);
            return `Deleted: ${result.deleted}`;
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
        {
          name: "delete_file",
          description:
            "Delete a file in the agent workspace. Cannot delete directories.",
          schema: z.object({
            path: z.string().describe("Relative path to the file to delete"),
          }),
        },
      ),
    ];
  },
};
