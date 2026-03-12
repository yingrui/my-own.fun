/**
 * ReAct-style agent graph built with createReactAgent.
 * Uses tools from enabled skills; prompt is built from environment.
 */

import type { BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
export interface AgentGraphOptions {
  llm: BaseChatModel;
  tools: StructuredToolInterface[];
  /** System prompt builder - receives env context, returns system message content */
  getSystemPrompt: () => Promise<string>;
}

/**
 * Builds a compiled ReAct agent graph.
 * The prompt function injects the environment system message before the LLM call.
 */
export function buildAgentGraph(options: AgentGraphOptions) {
  const { llm, tools, getSystemPrompt } = options;

  // Bind tools with tool_choice: "auto" so compatible APIs know to use tool calling.
  // Disable parallel_tool_calls for better compatibility with local models.
  const modelWithTools = tools.length > 0
    ? llm.bindTools(tools, { tool_choice: "auto", parallel_tool_calls: false } as Record<string, unknown>)
    : llm;

  return createReactAgent({
    llm: modelWithTools,
    tools,
    prompt: async (state, _config) => {
      const systemContent = await getSystemPrompt();
      const messages = state.messages ?? [];
      if (!systemContent) {
        return messages;
      }
      return [new SystemMessage(systemContent), ...messages];
    },
  });
}
