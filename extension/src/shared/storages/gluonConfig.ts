import {
  BaseStorage,
  createStorage,
  StorageType,
} from "@src/shared/storages/base";
import { createBackendStorage } from "@src/shared/storages/backendStorage";

/** A model provider (e.g. OpenAI, GLM, custom endpoint) */
export interface ProviderEntry {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  organization?: string;
}

export interface ModelEntry {
  id: string;
  name: string;
  providerId: string;
  capabilities: {
    chat: boolean;
    tools: boolean;
    thinking: boolean;
    vision: boolean;
    embedding: boolean;
  };
  isDefault?: boolean;
}

export type GluonConfigure = {
  apiKey: string;
  baseURL: string;
  organization: string;
  providers: ProviderEntry[];
  defaultModel: string;
  reasoningModel: string;
  toolsCallModel: string;
  multimodalModel: string;
  models: ModelEntry[];
  contextLength: number;
  maxTokens: number;
  baCopilotKnowledgeApi: string;
  baCopilotApi: string;
  baCopilotTechDescription: string;
  language: string;
  themeMode: "auto" | "light" | "dark";
  enableFloatingBall: boolean;
  enableReflection: boolean;
  enableMultimodal: boolean;
  enableChainOfThoughts: boolean;
  enableSearch: boolean;
  logLevel: string;
  enableOptionsAppSearch: boolean;
  enableOptionsAppChatbot: boolean;
  enableWriting: boolean;
  enableSuperAgent: boolean;
};

const DEFAULT_PROVIDER_ID = "default";

const DEFAULT_PROVIDERS: ProviderEntry[] = [
  {
    id: DEFAULT_PROVIDER_ID,
    name: "Default",
    baseURL: "",
    apiKey: "",
    organization: "",
  },
];

const DEFAULT_MODELS: ModelEntry[] = [
  {
    id: "glm-4-plus",
    name: "GLM-4 Plus",
    providerId: DEFAULT_PROVIDER_ID,
    capabilities: { chat: true, tools: true, thinking: false, vision: false, embedding: false },
    isDefault: true,
  },
  {
    id: "glm-4v-plus",
    name: "GLM-4V Plus",
    providerId: DEFAULT_PROVIDER_ID,
    capabilities: { chat: true, tools: false, thinking: false, vision: true, embedding: false },
    isDefault: false,
  },
];

type ConfigureStorage = BaseStorage<GluonConfigure>;

export const DEFAULT_GM_CONFIG_VALUE: GluonConfigure = {
  apiKey: "",
  baseURL: "",
  organization: "",
  providers: DEFAULT_PROVIDERS,
  defaultModel: "glm-4-plus",
  reasoningModel: "",
  toolsCallModel: "glm-4-plus",
  multimodalModel: "glm-4v-plus",
  models: DEFAULT_MODELS,
  contextLength: 5,
  maxTokens: 8192,
  baCopilotKnowledgeApi: "",
  baCopilotApi: "",
  baCopilotTechDescription: "",
  language: "English",
  themeMode: "auto",
  enableFloatingBall: true,
  enableReflection: false,
  enableMultimodal: false,
  enableChainOfThoughts: false,
  enableSearch: true,
  logLevel: "info",
  enableOptionsAppSearch: true,
  enableOptionsAppChatbot: false,
  enableWriting: false,
  enableSuperAgent: true,
};

/**
 * Migrate legacy config: if providers empty but apiKey/baseURL set, create one provider and assign models to it.
 * Also sync apiKey/baseURL/organization from first provider for backward compat.
 */
export function normalizeConfig(config: GluonConfigure): GluonConfigure {
  let providers = Array.isArray(config.providers) ? config.providers : [];
  const models = Array.isArray(config.models) ? config.models : DEFAULT_MODELS;

  if (providers.length === 0 && (config.apiKey || config.baseURL)) {
    providers = [{
      id: DEFAULT_PROVIDER_ID,
      name: "Default",
      baseURL: config.baseURL || "",
      apiKey: config.apiKey || "",
      organization: config.organization || "",
    }];
  }
  if (providers.length === 0) {
    providers = DEFAULT_PROVIDERS;
  }

  const first = providers[0];
  const modelsWithProvider = models.map((m) => ({
    ...m,
    providerId: m.providerId ?? first?.id ?? DEFAULT_PROVIDER_ID,
  }));

  return {
    ...config,
    themeMode: config.themeMode === "dark" || config.themeMode === "light" ? config.themeMode : "auto",
    maxTokens: typeof config.maxTokens === "number" && config.maxTokens > 0 ? config.maxTokens : DEFAULT_GM_CONFIG_VALUE.maxTokens,
    providers,
    models: modelsWithProvider,
    apiKey: first?.apiKey ?? config.apiKey,
    baseURL: first?.baseURL ?? config.baseURL,
    organization: first?.organization ?? config.organization,
  };
}

// Use backend storage with local storage fallback
// Set USE_BACKEND_STORAGE=false in environment to use local storage only
// Can be configured via: process.env.USE_BACKEND_STORAGE or import.meta.env.VITE_USE_BACKEND_STORAGE
const USE_BACKEND_STORAGE = 
  (typeof process !== "undefined" && process.env?.USE_BACKEND_STORAGE !== "false") ||
  import.meta.env?.VITE_USE_BACKEND_STORAGE !== "false" ||
  true; // Default to true (use backend)

const storage = USE_BACKEND_STORAGE
  ? createBackendStorage<GluonConfigure>("gm_configure_data", DEFAULT_GM_CONFIG_VALUE)
  : createStorage<GluonConfigure>(
      "gm_configure_data",
      DEFAULT_GM_CONFIG_VALUE,
      {
        storageType: StorageType.Local,
        liveUpdate: true,
      },
    );

let cachedSnapshot: GluonConfigure | null = null;
let cachedRaw: GluonConfigure | null = null;

function getStableSnapshot(): GluonConfigure {
  const snap = storage.getSnapshot();
  if (!snap) return DEFAULT_GM_CONFIG_VALUE;
  if (cachedRaw === snap) return cachedSnapshot!;
  cachedRaw = snap;
  cachedSnapshot = normalizeConfig(snap);
  return cachedSnapshot;
}

const configureStorage: ConfigureStorage = {
  get: async () => normalizeConfig(await storage.get()),
  set: storage.set,
  subscribe: storage.subscribe,
  getSnapshot: getStableSnapshot,
};

export default configureStorage;
