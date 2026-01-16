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
  // Basic Settings
  apiKey: "Basic",
  baseURL: "Basic",
  organization: "Basic",
  defaultModel: "Basic",
  reasoningModel: "Basic",
  toolsCallModel: "Basic",
  multimodalModel: "Basic",
  contextLength: "Basic",
  language: "Basic",
  // Feature Toggles
  enableFloatingBall: "Features",
  enableReflection: "Features",
  enableMultimodal: "Features",
  enableChainOfThoughts: "Features",
  enableSearch: "Features",
  enableOptionsAppSearch: "Features",
  enableOptionsAppChatbot: "Features",
  enableOptionsAppArchitect: "Features",
  enableWriting: "Features",
  enableHistoryRecording: "Features",
  // BA Copilot
  baCopilotKnowledgeApi: "BA Copilot",
  baCopilotApi: "BA Copilot",
  baCopilotTechDescription: "BA Copilot",
  // System
  logLevel: "System",
};

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
        cache = { ...fallback, ...settings } as D;
      } else {
        cache = fallback;
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
      cache = (value[key] || fallback) as D;
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
        settingsByCategory[category][key] = value;
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
      if (newValue && JSON.stringify(newValue) !== JSON.stringify(cache)) {
        cache = newValue as D;
        _emitChange();
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

