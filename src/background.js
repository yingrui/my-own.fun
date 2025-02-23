chrome.runtime.onMessage.addListener((message, sender) => {
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
          name: "Gru",
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

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    title: "Autocomplete",
    contexts: ["editable"],
    id: "autocomplete",
  });
});
