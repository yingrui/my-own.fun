export const delay = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));

function sendMessageToContentScript(message): Promise<any> {
  return new Promise<any>(function (resolve, reject) {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        resolve(response);
      });
    });
  });
}

export const get_content = async () => {
  return sendMessageToContentScript({ type: "get_content" });
};

export const get_html = async () => {
  return sendMessageToContentScript({ type: "get_html" });
};

let listenerInstalled = false;
export const installContentScriptCommandListener = (handler) => {
  if (listenerInstalled) return;

  listenerInstalled = true;
  chrome.storage.session.onChanged.addListener(async (changes) => {
    const data = await chrome.storage.session.get();
    const command = data["command_from_content_script"];
    if (command) {
      handler(command.tool, command.args, command.userInput);
    }
  });
};
