import { tool } from "@langchain/core/tools";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";
import type { Skill } from "./types";

export function createReadSkillTool(skills: Skill[]): StructuredToolInterface {
  const skillMap = new Map(skills.map((s) => [s.id, s]));
  const availableIds = [...skillMap.keys()].join(", ");

  return tool(
    async ({ skillId }: { skillId: string }) => {
      const skill = skillMap.get(skillId);
      return skill?.instructions ?? `Skill "${skillId}" not found. Available: ${availableIds}`;
    },
    {
      name: "read_skill",
      description:
        "Read the full instructions for a skill. Call this before using a skill's tools to understand best practices and workflow.",
      schema: z.object({
        skillId: z.string().describe("The skill id to read instructions for"),
      }),
    },
  );
}
