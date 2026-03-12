/**
 * Tab-level content helpers for deep research.
 * Provides get_content_for_tab (send message to a specific tab)
 * and open_url_and_get_content (open tab, wait for load, extract, close).
 */

import { delay } from "@src/shared/utils";

const DEFAULT_TIMEOUT_MS = 25_000;
const CONTENT_SCRIPT_SETTLE_MS = 800;

export interface TabPageContent {
  url: string;
  title: string;
  text: string;
  links: string[];
}

/**
 * Send get_content to a specific tab by ID.
 * Returns the same shape as the content script's response.
 */
export function getContentForTab(tabId: number, timeoutMs = 10_000): Promise<TabPageContent | null> {
  return new Promise<TabPageContent | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    chrome.tabs.sendMessage(tabId, { type: "get_content" }, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError || !response) {
        resolve(null);
      } else {
        resolve(response as TabPageContent);
      }
    });
  });
}

/**
 * Wait for a tab to finish loading (status === "complete").
 */
function waitForTabLoad(tabId: number, timeoutMs: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false);
    }, timeoutMs);

    function listener(updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

export interface OpenUrlOptions {
  active?: boolean;
  timeoutMs?: number;
  closeAfterRead?: boolean;
}

/**
 * Open a URL in a new tab, wait for it to load, extract content, and optionally close the tab.
 * Returns the extracted content or an error string.
 */
export async function openUrlAndGetContent(
  url: string,
  options: OpenUrlOptions = {},
): Promise<TabPageContent | string> {
  const {
    active = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    closeAfterRead = true,
  } = options;

  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.create({ url, active });
  } catch (err) {
    return `Failed to open tab for ${url}: ${err instanceof Error ? err.message : String(err)}`;
  }

  const tabId = tab.id;
  if (!tabId) {
    return `Failed to open tab for ${url}: no tab ID returned`;
  }

  const loaded = await waitForTabLoad(tabId, timeoutMs);
  if (!loaded) {
    if (closeAfterRead) {
      try { chrome.tabs.remove(tabId); } catch { /* ignore */ }
    }
    return `Timed out waiting for ${url} to load (${timeoutMs}ms).`;
  }

  // Small delay for content script to settle after page load
  await delay(CONTENT_SCRIPT_SETTLE_MS);

  const content = await getContentForTab(tabId, 10_000);

  if (closeAfterRead) {
    try { chrome.tabs.remove(tabId); } catch { /* ignore */ }
  }

  if (!content) {
    return `Page loaded but could not extract content from ${url}. The page may block content scripts (e.g. chrome://, PDF).`;
  }

  return content;
}
