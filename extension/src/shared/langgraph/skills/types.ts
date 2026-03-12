/**
 * Skill definition for LangGraph agent.
 * Skills are enabled via config and provide tools to the graph.
 */

import type { StructuredToolInterface } from "@langchain/core/tools";

export interface Skill {
  id: string;
  name: string;
  description: string;
  /** LangChain tools provided by this skill */
  getTools(): StructuredToolInterface[];
}
