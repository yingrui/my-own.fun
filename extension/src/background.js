chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "inject_microphone_permission") {
    (async () => {
      try {
        let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab?.id || !tab.url?.startsWith("http")) {
          [tab] = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
        }
        if (!tab?.id || !tab.url?.startsWith("http")) {
          const newTab = await chrome.tabs.create({ url: "https://www.google.com" });
          tab = newTab;
          await new Promise((r) => setTimeout(r, 1500));
        }
        if (!tab?.id || !tab.url?.startsWith("http")) {
          sendResponse({ ok: false, reason: "no_http_tab" });
          return;
        }
        const permissionUrl = chrome.runtime.getURL("src/pages/permission/index.html");
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (url) => {
            const iframe = document.createElement("iframe");
            iframe.id = "myfun-mic-permission-iframe";
            iframe.setAttribute("allow", "microphone");
            iframe.src = url;
            iframe.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:320px;border:1px solid #ccc;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:2147483647;background:white;";
            document.body.appendChild(iframe);
            const overlay = document.createElement("div");
            overlay.id = "myfun-mic-permission-overlay";
            overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:2147483646;";
            const close = () => { iframe.remove(); overlay.remove(); window.removeEventListener("message", onMsg); };
            overlay.onclick = close;
            const onMsg = (e) => { if (e.data === "myfun-mic-permission-close") close(); };
            window.addEventListener("message", onMsg);
            document.body.insertBefore(overlay, document.body.firstChild);
          },
          args: [permissionUrl],
        });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, reason: e?.message || "inject_failed" });
      }
    })();
    return true;
  }
  (async () => {
    if (message.type === "open_side_panel") {
      await chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    // Store the command from the content script in session storage, so that the side panel can access it
    // Since the message have timestamp, so the side panel will be noticed everytime the command is sent
    if (message.type === "command_from_content_script") {
      // Make sure the side panel is opened
      await chrome.sidePanel.open({ tabId: sender.tab.id });
      await chrome.storage.session.set({
        command_from_content_script: message.command,
      });
    }
  })();
});

// A generic onclick callback function.
chrome.contextMenus.onClicked.addListener(genericOnClick);

async function genericOnClick(info, tab) {
  if (info.editable) {
    if (info.menuItemId === "autocomplete") {
      // Get the editing text
      await chrome.sidePanel.open({ tabId: tab.id });
      const results = await getActiveElementTextContent(tab.id);
      const args = results[0].result;
      await chrome.storage.session.set({
        command_from_content_script: {
          name: "myFun",
          userInput: "/autocomplete",
          tool: "autocomplete",
          args: args,
          date: new Date().toISOString(),
        },
      });
    }
  } else {
    console.log("Context menu item clicked.", info);
  }
}

function getActiveElementTextContent(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: () => {
      let activeElement = document.activeElement;
      if (activeElement instanceof HTMLTextAreaElement) {
        const textarea = activeElement;
        const { value, selectionStart, selectionEnd } = textarea;
        return { text: value, selectionStart, selectionEnd };
      }
      return { text: activeElement.textContent };
    },
  });
}

chrome.runtime.onInstalled.addListener(function (details) {
  chrome.contextMenus.create({
    title: "Autocomplete",
    contexts: ["editable"],
    id: "autocomplete",
  });
  if (details.reason === "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("src/pages/permission/index.html"),
    });
  }
});
