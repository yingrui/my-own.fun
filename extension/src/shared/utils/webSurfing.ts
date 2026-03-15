/**
 * Web surfing helpers - send messages to content script for page layout and actions.
 * Navigate uses chrome.tabs directly (extension context only).
 */

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
