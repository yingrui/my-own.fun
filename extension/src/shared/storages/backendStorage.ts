/**
 * Backend-based storage implementation with local storage fallback
 */

import { BaseStorage } from "@src/shared/storages/base";
import {
  getSettings,
  updateSetting,
  bulkUpdateSettings,
  checkBackendHealth,
  ensureProfile,
} from "@src/shared/services/backendApi";

const SETTINGS_CATEGORY_MAP: Record<string, string> = {
  // Model Settings (formerly Basic)
  apiKey: "Basic",
  baseURL: "Basic",
  organization: "Basic",
  providers: "Basic",
  defaultModel: "Basic",
  reasoningModel: "Basic",
  toolsCallModel: "Basic",
  multimodalModel: "Basic",
  models: "Basic",
  contextLength: "Basic",
  // System (language moved from Basic UI to System Settings)
  language: "System",
  themeMode: "System",
  // Feature Toggles
  enableFloatingBall: "Features",
  enableReflection: "Features",
  enableMultimodal: "Features",
  enableChainOfThoughts: "Features",
  enableSearch: "Features",
  enableOptionsAppSearch: "Features",
  enableOptionsAppChatbot: "Features",
  enableWriting: "Features",
  // BA Copilot
  baCopilotKnowledgeApi: "BA Copilot",
  baCopilotApi: "BA Copilot",
  baCopilotTechDescription: "BA Copilot",
  // System
  logLevel: "System",
};

/** Keys that should be booleans; backend may return "True"/"False" strings */
const BOOLEAN_KEYS = new Set([
  "enableFloatingBall", "enableReflection", "enableMultimodal", "enableChainOfThoughts",
  "enableSearch", "enableOptionsAppSearch", "enableOptionsAppChatbot",
  "enableWriting",
]);

function normalizeBackendSettings<D extends Record<string, any>>(raw: Record<string, any>, fallback: D): D {
  const out = { ...fallback };
  for (const [k, v] of Object.entries(raw)) {
    if (!(k in fallback)) continue;
    if (BOOLEAN_KEYS.has(k)) {
      const s = typeof v === "string" ? v.toLowerCase() : String(v);
      (out as Record<string, any>)[k] = s === "true" || s === "1";
    } else if (k === "contextLength" && typeof fallback.contextLength === "number") {
      const n = Number(v);
      (out as Record<string, any>)[k] = Number.isFinite(n) ? n : fallback.contextLength;
    } else if (k === "models") {
      if (Array.isArray(v)) {
        (out as Record<string, any>)[k] = v;
      } else if (typeof v === "string") {
        try {
          const parsed = JSON.parse(v);
          (out as Record<string, any>)[k] = Array.isArray(parsed) ? parsed : (fallback as Record<string, any>).models;
        } catch {
          (out as Record<string, any>)[k] = (fallback as Record<string, any>).models;
        }
      } else {
        (out as Record<string, any>)[k] = (fallback as Record<string, any>).models;
      }
    } else if (k === "providers") {
      if (Array.isArray(v)) {
        (out as Record<string, any>)[k] = v;
      } else if (typeof v === "string") {
        try {
          const parsed = JSON.parse(v);
          (out as Record<string, any>)[k] = Array.isArray(parsed) ? parsed : (fallback as Record<string, any>).providers;
        } catch {
          (out as Record<string, any>)[k] = (fallback as Record<string, any>).providers;
        }
      } else {
        (out as Record<string, any>)[k] = (fallback as Record<string, any>).providers;
      }
    } else {
      (out as Record<string, any>)[k] = v;
    }
  }
  return out;
}

/**
 * Create a backend-based storage with local fallback
 */
export function createBackendStorage<D extends Record<string, any>>(
  key: string,
  fallback: D,
): BaseStorage<D> {
  let cache: D | null = null;
  let listeners: Array<() => void> = [];
  let backendAvailable = false;
  let useBackend = true; // Flag to enable/disable backend usage

  // Check backend availability on initialization
  (async () => {
    const available = await checkBackendHealth();
    backendAvailable = available;
    if (available) {
      await ensureProfile();
      await loadFromBackend();
    } else {
      // Fallback to local storage
      await loadFromLocalStorage();
    }
  })();

  const _emitChange = () => {
    listeners.forEach((listener) => listener());
  };

  const loadFromBackend = async () => {
    try {
      const settings = await getSettings();
      if (settings && Object.keys(settings).length > 0) {
        cache = normalizeBackendSettings(settings, fallback);
      } else {
        const value = await chrome.storage.local.get([key]);
        const localData = value[key];
        cache = (localData && typeof localData === "object" && Object.keys(localData).length > 0
          ? normalizeBackendSettings(localData as Record<string, any>, fallback)
          : fallback) as D;
      }
      _emitChange();
    } catch (error) {
      console.error("Failed to load from backend, using local storage:", error);
      loadFromLocalStorage();
    }
  };

  const loadFromLocalStorage = async () => {
    try {
      const value = await chrome.storage.local.get([key]);
      const raw = value[key];
      if (raw && typeof raw === "object" && Object.keys(raw).length > 0) {
        cache = normalizeBackendSettings(raw as Record<string, any>, fallback);
      } else {
        cache = fallback;
      }
      _emitChange();
    } catch (error) {
      console.error("Failed to load from local storage:", error);
      cache = fallback;
      _emitChange();
    }
  };

  const saveToBackend = async (data: D): Promise<boolean> => {
    if (!useBackend || !backendAvailable) {
      return false;
    }

    try {
      // Group settings by category for bulk update
      const settingsByCategory: Record<string, Record<string, any>> = {};

      for (const [key, value] of Object.entries(data)) {
        const category = SETTINGS_CATEGORY_MAP[key] || "Basic";
        if (!settingsByCategory[category]) {
          settingsByCategory[category] = {};
        }
        // Persist models array as JSON string for backend key-value storage
        if (key === "models" && Array.isArray(value)) {
          settingsByCategory[category][key] = JSON.stringify(value);
        } else if (key === "providers" && Array.isArray(value)) {
          settingsByCategory[category][key] = JSON.stringify(value);
        } else {
          settingsByCategory[category][key] = value;
        }
      }

      // Update each category
      const promises = Object.entries(settingsByCategory).map(([category, settings]) =>
        bulkUpdateSettings(settings, category)
      );

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error("Failed to save to backend:", error);
      backendAvailable = false;
      return false;
    }
  };

  const saveToLocalStorage = async (data: D): Promise<void> => {
    try {
      await chrome.storage.local.set({ [key]: data });
    } catch (error) {
      console.error("Failed to save to local storage:", error);
    }
  };

  const set = async (valueOrUpdate: D | ((prev: D) => D)) => {
    const newValue =
      typeof valueOrUpdate === "function"
        ? (valueOrUpdate as (prev: D) => D)(cache || fallback)
        : valueOrUpdate;

    cache = newValue;

    // Try backend first, fallback to local storage
    const savedToBackend = await saveToBackend(newValue);
    if (!savedToBackend) {
      await saveToLocalStorage(newValue);
    } else {
      // Also save to local storage as backup
      await saveToLocalStorage(newValue);
    }

    _emitChange();
  };

  const subscribe = (listener: () => void) => {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  };

  const getSnapshot = () => {
    return cache;
  };

  const get = async (): Promise<D> => {
    // If cache is already loaded, return it
    if (cache !== null) {
      return cache;
    }
    
    // Otherwise, try to load from backend or local storage
    if (backendAvailable) {
      try {
        await loadFromBackend();
        return cache || fallback;
      } catch (error) {
        // Fallback to local storage
        await loadFromLocalStorage();
        return cache || fallback;
      }
    } else {
      await loadFromLocalStorage();
      return cache || fallback;
    }
  };

  // Initial load is handled in the async block above

  // Listen for changes from other extension instances (local storage sync)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[key]) {
      const newValue = changes[key].newValue;
      if (newValue && typeof newValue === "object") {
        const normalized = normalizeBackendSettings(newValue as Record<string, any>, fallback);
        if (JSON.stringify(normalized) !== JSON.stringify(cache)) {
          cache = normalized as D;
          _emitChange();
        }
      }
    }
  });

  return {
    get,
    set,
    subscribe,
    getSnapshot,
  };
}

