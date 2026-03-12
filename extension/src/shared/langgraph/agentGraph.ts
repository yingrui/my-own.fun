/**
 * ReAct-style agent graph built with createReactAgent.
 * Uses tools from enabled skills; prompt is built from environment.
 */

import type { BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
export interface AgentGraphOptions {
  llm: BaseChatModel;
  tools: StructuredToolInterface[];
  /** System prompt builder - receives env context, returns system message content */
  getSystemPrompt: () => Promise<string>;
}

function bindToolsNative(llm: BaseChatModel, tools: StructuredToolInterface[]) {
  if (tools.length === 0) return llm;
  try {
    return llm.bindTools(
      tools,
      { tool_choice: "auto", parallel_tool_calls: false } as Record<string, unknown>,
    );
  } catch (bindToolsError) {
    // Fallback for some OpenAI-compatible providers that do not support bindTools semantics.
    try {
      return llm.bind({
        tools: tools.map((t) => convertToOpenAITool(t)),
        tool_choice: "auto",
      } as Record<string, unknown>);
    } catch {
      // Keep the original model so chat remains functional even if tool binding is unavailable.
      console.warn("[LangGraph] Native tool binding unavailable:", bindToolsError);
      return llm;
    }
  }
}

/**
 * Builds a compiled ReAct agent graph.
 * The prompt function injects the environment system message before the LLM call.
 */
export function buildAgentGraph(options: AgentGraphOptions) {
  const { llm, tools, getSystemPrompt } = options;

  const modelWithTools = bindToolsNative(llm, tools);

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
