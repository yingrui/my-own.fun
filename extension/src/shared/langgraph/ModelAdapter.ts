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
    modelKwargs: {},
    // Preserve raw API response on each chunk so we can extract non-standard fields like delta.reasoning
    __includeRawResponse: true,
  } as ConstructorParameters<typeof ChatOpenAI>[0]);
}
