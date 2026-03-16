/**
 * Creates ChatOpenAI from GluonConfigure for LangGraph.
 * Uses getModelForCapability for tool-calling when models registry is present, otherwise toolsCallModel/defaultModel.
 * Resolves API credentials from the provider that owns the selected model.
 * Uses DeepSeekCompatibleChatOpenAI when the model is DeepSeek so thinking mode + tool-calls work (reasoning_content).
 */

import { ChatOpenAI } from "@langchain/openai";
import { DeepSeekCompatibleChatOpenAI } from "@src/shared/langgraph/DeepSeekChatModel";
import type { GluonConfigure, ModelEntry } from "@src/shared/storages/gluonConfig";

export type ModelCapability = "chat" | "tools" | "thinking" | "vision" | "embedding";

/**
 * Resolves the model id to use for a given capability.
 */
export function getModelForCapability(
  config: GluonConfigure,
  capability: ModelCapability,
  fallback?: string
): string {
  const overrideByCapability: Record<ModelCapability, string | undefined> = {
    chat: config.defaultModel,
    tools: config.toolsCallModel,
    thinking: config.reasoningModel,
    vision: config.multimodalModel,
    embedding: undefined,
  };
  const override = overrideByCapability[capability];

  const models = config.models;
  if (Array.isArray(models) && models.length > 0) {
    const capKey = capability as keyof ModelEntry["capabilities"];
    const withCap = models.filter((m) => m.capabilities?.[capKey]);
    const defaultWithCap = withCap.find((m) => m.isDefault);
    const chosen = defaultWithCap ?? withCap[0];
    if (chosen?.id) return chosen.id;
  }

  return override ?? config.defaultModel ?? fallback ?? "gpt-4o-mini";
}

/**
 * Returns the provider for the given model id (from config.models[].providerId).
 * Falls back to config.apiKey/baseURL/organization if no provider found (legacy).
 */
export function getProviderForModel(
  config: GluonConfigure,
  modelId: string
): { apiKey: string; baseURL: string; organization?: string } {
  const model = config.models?.find((m) => m.id === modelId);
  const providerId = model?.providerId;
  const provider = Array.isArray(config.providers)
    ? config.providers.find((p) => p.id === providerId)
    : undefined;
  if (provider) {
    return {
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      organization: provider.organization,
    };
  }
  return {
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    organization: config.organization,
  };
}

export function createChatModel(config: GluonConfigure, modelOverride?: string): ChatOpenAI {
  const model =
    modelOverride ??
    getModelForCapability(config, "tools", config.defaultModel ?? "gpt-4o-mini");
  const creds = getProviderForModel(config, model);
  const isDeepSeekReasoner = /deepseek-reasoner/i.test(model);
  const baseConfig = {
    apiKey: creds.apiKey,
    configuration: {
      baseURL: creds.baseURL,
      defaultHeaders: creds.organization
        ? { "OpenAI-Organization": creds.organization }
        : undefined,
    },
    model,
    temperature: 0.5,
    maxTokens: config.maxTokens ?? 8192,
    // Keep native tool-calling on chat-completions for OpenAI-compatible endpoints.
    useResponsesApi: false,
    modelKwargs: {},
    __includeRawResponse: true,
  } as ConstructorParameters<typeof ChatOpenAI>[0];

  if (isDeepSeekReasoner) {
    return new DeepSeekCompatibleChatOpenAI(baseConfig);
  }
  return new ChatOpenAI(baseConfig);
}
