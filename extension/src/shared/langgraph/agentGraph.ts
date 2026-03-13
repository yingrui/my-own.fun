import { SystemMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { Skill } from "@src/shared/langgraph/skills";
import { createReadSkillTool } from "@src/shared/langgraph/skills/readSkillTool";

export interface AgentGraphOptions {
  llm: BaseChatModel;
  tools: StructuredToolInterface[];
  skills?: Skill[];
  getSystemPrompt: () => Promise<string>;
}

// ---------------------------------------------------------------------------
// Tool binding
// ---------------------------------------------------------------------------

function bindToolsNative(llm: BaseChatModel, tools: StructuredToolInterface[]) {
  if (tools.length === 0) return llm;
  try {
    return llm.bindTools(
      tools,
      { tool_choice: "auto", parallel_tool_calls: false } as Record<string, unknown>,
    );
  } catch (bindToolsError) {
    try {
      return llm.bind({
        tools: tools.map((t) => convertToOpenAITool(t)),
        tool_choice: "auto",
      } as Record<string, unknown>);
    } catch {
      console.warn("[LangGraph] Native tool binding unavailable:", bindToolsError);
      return llm;
    }
  }
}

// ---------------------------------------------------------------------------
// Skills system — progressive disclosure via read_skill tool
// ---------------------------------------------------------------------------

function buildSkillsPrompt(skills: Skill[]): string {
  if (skills.length === 0) return "";
  const index = skills
    .map((s) => `- **${s.name}** (id: \`${s.id}\`): ${s.description}`)
    .join("\n");
  return `\n\n## Skills System\n\nYou have access to the following skills. Before using a skill's tools, call \`read_skill\` with the skill id to get detailed instructions.\n\n${index}`;
}

// ---------------------------------------------------------------------------
// Graph builder
// ---------------------------------------------------------------------------

export function buildAgentGraph(options: AgentGraphOptions) {
  const { llm, tools, skills = [], getSystemPrompt } = options;

  const withInstructions = skills.filter((s) => s.instructions);
  const readSkill = withInstructions.length > 0 ? createReadSkillTool(withInstructions) : null;
  const allTools = readSkill ? [...tools, readSkill] : tools;
  const skillsPrompt = buildSkillsPrompt(withInstructions);
  const modelWithTools = bindToolsNative(llm, allTools);

  return createReactAgent({
    llm: modelWithTools,
    tools: allTools,
    prompt: async (state) => {
      const systemContent = await getSystemPrompt();
      const messages = state.messages ?? [];
      const fullPrompt = systemContent ? systemContent + skillsPrompt : "";
      if (!fullPrompt) return messages;
      return [new SystemMessage(fullPrompt), ...messages];
    },
  });
}
