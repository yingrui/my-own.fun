/**
 * Web surfing helpers - send messages to content script for page layout and actions.
 * Navigate uses chrome.tabs directly (extension context only).
 */

import { get_content } from "@src/shared/utils";

export interface OpenTabInfo {
  id: number;
  title: string;
  url: string;
}

function sendToActiveTab<T = unknown>(message: Record<string, unknown>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        reject(new Error("No active tab"));
        return;
      }
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response as T);
        }
      });
    });
  });
}

export interface PageLayoutData {
  url: string;
  title: string;
  layout: Record<string, unknown>;
}

export interface PageContentData {
  url: string;
  title: string;
  text: string;
  links: Array<{ text: string; href: string }>;
}

function getContentFromTab(tabId: number): Promise<PageContentData | null> {
  return new Promise<PageContentData | null>((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "get_content" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        resolve(null);
      } else {
        resolve(response as PageContentData);
      }
    });
  });
}

export async function getPageContent(tabId?: number): Promise<string> {
  try {
    const content = tabId
      ? await getContentFromTab(tabId)
      : ((await get_content()) as PageContentData | null);
    if (!content) {
      return "Could not get page content. The extension may not be attached to the page.";
    }
    const maxLength = 100 * 1024;
    const text =
      content.text?.length > maxLength
        ? `${content.text.slice(0, maxLength)}\n\n... [truncated]`
        : content.text ?? "";
    return JSON.stringify(
      { url: content.url, title: content.title, text, links: content.links ?? [] },
      null,
      2,
    );
  } catch {
    return "Could not get page content. The extension may not be attached to the page.";
  }
}

export async function getOpenTabs(): Promise<OpenTabInfo[]> {
  const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({ currentWindow: true }, resolve);
  });
  return tabs
    .filter((t): t is chrome.tabs.Tab & { id: number } => typeof t.id === "number")
    .map((t) => ({ id: t.id, title: t.title ?? t.url ?? "", url: t.url ?? "" }));
}

export async function getPageLayout(): Promise<PageLayoutData | null> {
  try {
    const res = await sendToActiveTab<{ success: boolean; data?: PageLayoutData; error?: string }>({
      type: "get_page_layout",
    });
    return res?.success && res.data ? res.data : null;
  } catch {
    return null;
  }
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function clickElement(xpath: string): Promise<ActionResult> {
  try {
    const res = await sendToActiveTab<ActionResult>({ type: "click_element", xpath });
    return res ?? { success: false, error: "No response" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function inputText(xpath: string, value: string): Promise<ActionResult> {
  try {
    const res = await sendToActiveTab<ActionResult>({ type: "input_text", xpath, value });
    return res ?? { success: false, error: "No response" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function submitForm(xpath: string): Promise<ActionResult> {
  try {
    const res = await sendToActiveTab<ActionResult>({ type: "submit_form", xpath });
    return res ?? { success: false, error: "No response" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function navigateToUrl(url: string): Promise<ActionResult> {
  try {
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
      chrome.tabs.query({ currentWindow: true, active: true }, resolve);
    });
    const tab = tabs[0];
    if (!tab?.id) return { success: false, error: "No active tab" };
    await chrome.tabs.update(tab.id, { url });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
