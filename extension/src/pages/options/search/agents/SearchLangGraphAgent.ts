/**
 * Search agent using LangGraph/LLM for summarizing search results.
 * Replaces ThoughtAgent-based SearchAgent.
 */

import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import Thought from "@src/shared/agents/core/Thought";
import { createChatModel } from "@src/shared/langgraph/ModelAdapter";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export interface SearchAgentInterface {
  setSearchResults(results: unknown): void;
  summary(args: { userInput: string }, messages: unknown[]): Promise<Thought>;
}

export function createSearchAgent(config: GluonConfigure): SearchAgentInterface {
  const language = config.language ?? "English";
  let searchResults: unknown = null;

  return {
    setSearchResults(results: unknown) {
      searchResults = results;
    },

    async summary(args: { userInput: string }, _messages: unknown[]): Promise<Thought> {
      const userInput = args.userInput ?? "";
      const results = searchResults;

      const systemPrompt = `## Role
You're Chrome extension, you can answer user questions based on the search results from duckduckgo.

## Instructions
* If user question is closed question, directly answer it based on search results.
* If user question is open question:
  * Summarize and answer the question (add reference link in answer).
  * Recommend links or new search query to user.
* If user is asking what is or looking for details of something
  * Provide abstract information.
* If user is asking how to
  * Provide a framework or steps.
  * If possible, show result in mermaid chart, and think about the direction of chart.
* If user is asking what happened or what is the history of
  * Provide a timeline with related events with links.
* If user is asking for comparison
  * Provide a comparison table.

Note: List the related links.

## Search Results
${JSON.stringify(results ?? {}, null, 2)}

## User Input
${userInput}`;

      const llm = createChatModel(config);
      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(
          `please analysis search results and answer questions in ${language}:`,
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
