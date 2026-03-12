/**
 * Creates ChatOpenAI from GluonConfigure for LangGraph.
 * Uses toolsCallModel when available, otherwise defaultModel.
 */

import { ChatOpenAI } from "@langchain/openai";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";

export function createChatModel(config: GluonConfigure, modelOverride?: string): ChatOpenAI {
  const model = modelOverride ?? config.toolsCallModel ?? config.defaultModel ?? "gpt-4o-mini";
  return new ChatOpenAI({
    apiKey: config.apiKey,
    configuration: {
      baseURL: config.baseURL,
      defaultHeaders: config.organization
        ? { "OpenAI-Organization": config.organization }
        : undefined,
    },
    model,
    temperature: 0,
    // Ensure compatibility with various OpenAI-compatible APIs
    modelKwargs: {},
  });
}
