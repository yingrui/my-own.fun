import { matchURL } from "@pages/content/injected/listeners/utils";
import PageParser from "@src/shared/webpage/PageParser";
import LayoutElement from "@src/shared/webpage/LayoutElement";

function resolveByXpath(xpath: string): HTMLElement | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  );
  const node = result.singleNodeValue;
  return node instanceof HTMLElement ? node : null;
}

const addCommands = () => {
  let visualizedTree: LayoutElement | null = null;

  const visualizeLayout = (tree: LayoutElement) => {
    tree.element.style.border = "1px solid red";
    for (const child of tree.children) {
      visualizeLayout(child);
    }
  };

  const unvisualizeLayout = (tree: LayoutElement) => {
    tree.element.style.border = "";
    for (const child of tree.children) {
      unvisualizeLayout(child);
    }
  };

  if (matchURL("*")) {
    document.addEventListener("keydown", function (event) {
      if (!event.ctrlKey && event.altKey && event.key === "Enter") {
        // Open side panel when press alt+enter
        chrome.runtime.sendMessage({ type: "open_side_panel" });
      }
      if (event.ctrlKey && event.altKey && event.key === "Enter") {
        // Toggle layout visualization on screen when press ctrl+alt+enter
        if (visualizedTree) {
          unvisualizeLayout(visualizedTree);
          visualizedTree = null;
        } else {
          const page = new PageParser(document).parse();
          visualizeLayout(page.layoutTree);
          visualizedTree = page.layoutTree;
        }
      }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "get_content") {
        const page = new PageParser(document).parseContent();
        sendResponse(page);
        return true;
      } else if (message.type === "get_html") {
        const bodyClone = document.querySelector("body").cloneNode(true);
        (bodyClone as HTMLElement)
          .querySelectorAll("script, svg, style")
          .forEach((elem) => elem.remove());
        sendResponse({
          url: document.URL,
          title: document.title,
          html: (bodyClone as HTMLElement).innerHTML,
        });
        return true;
      } else if (message.type === "get_page_layout") {
        try {
          const page = new PageParser(document).parse();
          const layoutPojo = page.layoutTree?.toPojoSlim();
          const data = { url: page.url, title: page.title, layout: layoutPojo };
          sendResponse({ success: true, data });
        } catch (err) {
          sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
        return true;
      } else if (message.type === "click_element") {
        const el = resolveByXpath(message.xpath);
        if (!el) {
          sendResponse({ success: false, error: "Element not found" });
          return true;
        }
        try {
          el.click();
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
        return true;
      } else if (message.type === "input_text") {
        const el = resolveByXpath(message.xpath);
        if (!el) {
          sendResponse({ success: false, error: "Element not found" });
          return true;
        }
        try {
          const input = el as HTMLInputElement | HTMLTextAreaElement;
          input.value = message.value ?? "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
        return true;
      } else if (message.type === "submit_form") {
        const el = resolveByXpath(message.xpath);
        if (!el) {
          sendResponse({ success: false, error: "Element not found" });
          return true;
        }
        try {
          if (el instanceof HTMLFormElement) {
            el.submit();
          } else if (el.tagName.toLowerCase() === "button" || (el as HTMLInputElement).type === "submit") {
            const form = el.closest("form");
            if (form) form.submit();
            else el.click();
          } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            // Simulate Enter key to submit (e.g. search inputs, single-line forms)
            const opts = { key: "Enter", keyCode: 13, which: 13, bubbles: true };
            el.dispatchEvent(new KeyboardEvent("keydown", opts));
            el.dispatchEvent(new KeyboardEvent("keypress", opts));
            el.dispatchEvent(new KeyboardEvent("keyup", opts));
          } else {
            el.click();
          }
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
        return true;
      }
    });
  }
};

addCommands();
