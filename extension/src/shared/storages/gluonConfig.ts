import {
  BaseStorage,
  createStorage,
  StorageType,
} from "@src/shared/storages/base";
import { createBackendStorage } from "@src/shared/storages/backendStorage";

export type GluonConfigure = {
  apiKey: string;
  baseURL: string;
  organization: string;
  defaultModel: string;
  reasoningModel: string;
  toolsCallModel: string;
  multimodalModel: string;
  contextLength: number;
  baCopilotKnowledgeApi: string;
  baCopilotApi: string;
  baCopilotTechDescription: string;
  language: string;
  enableFloatingBall: boolean;
  enableReflection: boolean;
  enableMultimodal: boolean;
  enableChainOfThoughts: boolean;
  enableSearch: boolean;
  logLevel: string;
  // below are for options app
  enableOptionsAppSearch: boolean;
  enableOptionsAppChatbot: boolean;
  enableOptionsAppArchitect: boolean;
  enableWriting: boolean;
  enableHistoryRecording: boolean;
};

type ConfigureStorage = BaseStorage<GluonConfigure>;

export const DEFAULT_GM_CONFIG_VALUE = {
  apiKey: "",
  baseURL: "",
  organization: "",
  defaultModel: "glm-4-plus",
  reasoningModel: "",
  toolsCallModel: "glm-4-plus",
  multimodalModel: "glm-4v-plus",
  contextLength: 5,
  baCopilotKnowledgeApi: "",
  baCopilotApi: "",
  baCopilotTechDescription: "",
  language: "English",
  enableFloatingBall: true,
  enableReflection: false,
  enableMultimodal: false,
  enableChainOfThoughts: false,
  enableSearch: true,
  logLevel: "info",
  // below are for options app
  enableOptionsAppSearch: true,
  enableOptionsAppChatbot: false,
  enableOptionsAppArchitect: true,
  enableWriting: false,
  enableHistoryRecording: false,
};

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

const configureStorage: ConfigureStorage = {
  ...storage,
};

export default configureStorage;
