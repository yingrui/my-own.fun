/**
 * Popup agent: provides recommend() using LangGraph/LLM.
 * Replaces BrowserCopilot (ThoughtAgent) for the popup.
 */

import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import { get_content } from "@src/shared/utils";
import Thought from "@src/shared/agents/core/Thought";
import { createChatModel } from "@src/shared/langgraph/ModelAdapter";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export interface PopupAgent {
  recommend(args: { history?: string }): Promise<Thought>;
}

export async function createPopupAgent(config: GluonConfigure): Promise<PopupAgent> {
  const language = config.language ?? "English";

  return {
    async recommend(args: { history?: string }) {
      const history = args.history ?? "";
      let pageText = "";
      try {
        const content = await get_content();
        if (content) {
          const maxLen = 100 * 1024;
          pageText =
            content.text.length > maxLen
              ? content.text.slice(0, maxLen) + "\n\n... [truncated]"
              : content.text;
        }
      } catch {
        pageText = "Unable to get current page content.";
      }

      const systemPrompt = `## Role
You're browser copilot, you know many useful websites and how to get information from them.

### Task
Based on the user's browsing history & current viewing web page, you can help user to find the information they need.

About the instruction, since you are the browser extension, you can do:
- Side panel: open the 'side panel' to ask AI assistant more questions.
- Options page: open the 'options page' to use tools like: AI Search, Writing Assistant, Document Intelligence, etc.

## Context

### Browsing History
${history}

### Current Web Page
${pageText}

## Output Format
Give your guess first, then provide your suggestion and instructions.
Output should be markdown format.`;

      const llm = createChatModel(config);
      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(
          `Please guess what I need, and give me some suggestion, answer me in ${language}:`,
        ),
      ]);
      const text =
        typeof response.content === "string"
          ? response.content
          : String(response.content ?? "");

      return new Thought({ type: "message", message: text });
    },
  };
}
