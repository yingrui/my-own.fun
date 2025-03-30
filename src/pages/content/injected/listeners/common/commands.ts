import { matchURL } from "@pages/content/injected/listeners/utils";
import PageParser from "@src/shared/webpage/PageParser";

import { LayoutElement } from "@src/shared/webpage/LayoutElement";

const addCommands = () => {
  const visualizeLayout = (tree: LayoutElement) => {
    tree.element.style.border = "1px solid red";
    for (const child of tree.children) {
      visualizeLayout(child);
    }
  };

  if (matchURL("*")) {
    document.addEventListener("keydown", function (event) {
      if (!event.ctrlKey && event.altKey && event.key === "Enter") {
        // Open side panel when press alt+enter
        chrome.runtime.sendMessage({ type: "open_side_panel" });
      }
      if (event.ctrlKey && event.altKey && event.key === "Enter") {
        // Show layout on screen when press ctrl+alt+enter
        const page = new PageParser(document).parse();
        visualizeLayout(page.layoutTree);
      }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      (async () => {
        // Get content from the page
        if (message.type === "get_content") {
          const page = new PageParser(document).parseContent();
          sendResponse(page);
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
        }
      })();
    });
  }
};

addCommands();
