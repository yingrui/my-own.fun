# An Introduction to my-own.fun (myFun for short)

This Chrome extension has been designed to provide a seamless experience for users, offering a range of features to enhance your browsing experience. This document will guide you on how to use the extension effectively.

The interactions with this extension include:

* **Chat in Side Panel**: This is a conversation UI extension, you can have a conversation with myFun in the side panel. 
* **Right-click**: when you right-click the mouse in webpage, the context menu will showup. Currently, it only supports `Generate Text` action.
* **Floating Ball or Shortcut key**: Click floating ball or type `alt + enter` to open side panel. In the future, there will be more shortcuts to trigger new functions.
* **Tools in Options Page**: There are many tools you can use in options page when you click `Other Tools` button in popup window.  

Before we dive in, let's introduce some concepts in this Chrome extension:

* **Popup Window**: Manages additional settings and can save configurations specifically for the agent operations within the Side Panel.
* **Agents & Commands**: in this extension, there are many agents with different tools, such as `myFun`, `SummaryAgent`, `GoogleAgent`, `TranslateAgent`, `TrelloAgent`, etc. These agents are packed in side panel, the agent can recognize your intent and then call other agents to help you. Some tools of agent have been set as commands, you can type `/` in the chat box to execute corresponding tools directly.
* **Side Panel**: the side panel is used to chat with myFun, and it will show the results of the tools you executed. All the results will be displayed in Markdown format. Other agents do not need to write code for displaying.
* **Options Page**: the options page is like offline Web application run in your local environment, there are many tools in options page.
* **Context Menus**: in Chrome extension, when you right-click the mouse it can provide some quick actions, it is called context menu. This extension provide `Generate Text` action when you are writing in a text area and right-click the mouse.
* **Content Script**: Some actions need to get more details information from webpage, or need to execute automatically in webpage. For example, if you think the generated story is good, then you want to create a Trello card automatically.
* **Background Service Worker**: Extension service workers are an extension's central event handler, it is processing layer that manages interactions and data flow between the Content Script and the Side Panel.

```mermaid
graph TD;
    B[Popup Window] -->|saves config for| C[AI Agents & Commands in Side Panel or Option Page]
    C -->|sends message & instruction to| D[Content Script]
    D -->|gets info from| E[Web Page]
    D -->|sends info to| F[Background Service Worker]
    F -->|processes or forwards info & commands to| C

    classDef className fill:#f9,stroke:#333,stroke-width:2px;
    class B,C,D,E,F className;
```

## 1. Agents & Commands

The `myFun` will try to understand your intent and call the tools provided by other agents. And you can also directly send command to execute. Here are the commands when you type `/` in the chat box, you will see:

![type_slash_show_commands.png](../images/type_slash_show_commands.png)

Command `/clear` is used to clear the chat history, it does not belong to any agent.

You can also type `@` to directly send instructions to specific agent. Below shows 4 current existed agents:

![type_at_show_agents.png](../images/type_at_show_agents.png)

Next, we will introduce the agents and the tools provided by them.

### 1.1. myFun, the Composite Agent

**Agent Name**: myFun

This is a composite agent in this extension. myFun is designed to understand your intent and call the tools provided by other agents to help you.
And it also can provide a summary of the text or answer questions related to the current web page.

**Supported Command**:
* **Implemented Command**: summary
* **Delegate Command**: search, tasking, ui_test, user_story

This agent implements tools as below:

* **Summary**: Quickly grasp the main points of any extensive text with our efficient summarization tool.
* **Generate Text**: Craft specific texts for various purposes, boosting your creativity and efficiency. *Note: This command can be triggered by right-clicking in a text area.*

The sequence diagram for the `/summary` command:
```mermaid
sequenceDiagram
    participant User
    participant myFun
        
    participant Content Script
    participant Remote Model Service

    User->>myFun: Enters command (e.g., /summary)
    myFun->>Content Script: send get_content message to content script
    Content Script->>myFun: send content to agent
    myFun->>Remote Model Service: generate summary, return streaming message
    myFun->>User: display on side panel
```

### 1.2. SearchAgent

**Agent Name**: Seeker, your search assistant.

SearchAgent allows you to search content from `DuckDuckGo` or use Google to search information from side panel.

**Supported Command**: search

Agent has tools as below:

* **Google**: Open Google search page from your browser.
* **Search**: Search information from `DuckDuckGo`.
* **Open Url**: Based on your command, open url showing in conversation.

### 1.3. TranslateAgent

**Agent Name**: Translator, your translation assistant.

TranslateAgent allows you to effortlessly translate conversation information between Chinese and English or into other specified languages.

**Supported Command**: translate

Agent has tools as below:

* **Translate**: Effortlessly translate content between Chinese and English or into other specified languages.

### 1.4. BACopilotAgent

**Agent Name**: BACopilot, your BA assistant.

BACopilotAgent provides tools to help you to generate stories and breakdown these stories with story board.

**Supported Command**: user_story, tasking

Agent has tools as below:

* **User Story**: Automatically create engaging narrative content for new Trello board cards.
* **Tasking**: Generate tasking results based on the description of the trello card you are currently viewing.

The sequence diagram for the `/tasking` command:
```mermaid
sequenceDiagram
    participant User
    participant myFun
    participant BACopilotAgent
    participant Content Script
    participant Backend KnowledgeService
    participant Backend Model Service

    User->>myFun: Enters command (e.g., /tasking)
    myFun->>BACopilotAgent: parse command and forward to BA Copilot agent
    BACopilotAgent->>Content Script: send get_board message to content script
    Content Script->>BACopilotAgent: send details of board or card to agent
    BACopilotAgent->>Backend KnowledgeService: retrieve tasking example or implementation reference via knowledge api
    Backend KnowledgeService->>BACopilotAgent: return search results
    BACopilotAgent->>Backend Model Service: generate tasking results, return streaming message
    BACopilotAgent->>myFun: display on side panel
    myFun->>User: View tasking results
```

## 2. Side Panel

When the first time you installed the extension, after you open a new tab or refresh the current tab, there are multiple ways to open the side panel.

### 2.1. Floating Ball

You will see the floating ball on the right side of the webpage, you can click it to open side panel, then you can chat with myFun.

![floating_ball.png](../images/floating_ball.png)

If it doesn't work, please refresh the webpage or reload the extension.


The floating ball is implemented in content script, and it can open side panel by sending a message to the background service worker. The code is like this:
```typescript
// in content script
chrome.runtime.sendMessage({ type: "open_side_panel" });

// in background service worker
chrome.runtime.onMessage.addListener((message, sender) => {
  (async () => {
    if (message.type === "open_side_panel") {
      await chrome.sidePanel.open({ tabId: sender.tab.id });
    }
  })();
});
```

### 2.2. Shortcut Key

You can type `alt + enter` to open the side panel. If it doesn't work, please refresh the webpage or reload the extension.

This is also implemented in content script, and it can open side panel by sending a message to the background service worker:
```typescript
document.addEventListener("keydown", (event) => {
  if (event.altKey && event.key === "Enter") {
    chrome.runtime.sendMessage({ type: "open_side_panel" });
  }
});
```

### 2.3. Click the Toolbar to Open Side Panel

You can click the extension icon in the toolbar to open the side panel. In this way, you need click 3 times to open the side panel.

![open_side_panel_from_toolbar.png](../images/open_side_panel_from_toolbar.png)

## 3. Context Menus

When you right-click the mouse in an `editable` text area, the context menu will show up. If you click the action item, then the command will be executed in sidepanel.

![generate_text_action_item_in_context_menu.png](../images/generate_text_action_item_in_context_menu.png)

Currently, it only supports the `Generate Text` action. But you can add more context menu by yourself, for example:

* When you're read an article, and you don't understand something, then you can selected the text in the webpage, you can click the `explain` context menu. Which is a new functionality you can contribute.

## 4. Content Scripts

Some actions need to get more details information from the webpage, or need to execute some actions automatically in the webpage. So we need use the content scripts to achieve this, and it could be extended in the future.

For example, there is the `get_content` message, and this extension can send this message to get the webpage content and then generate a summary or ask questions.

This is an example of content script, which can help us to get the content of the webpage:

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "get_content") {
      sendResponse({
        title: document.title,
        text: document.body.innerText,
        url: document.URL,
      });
    }
  })();
});
```

## 5. Options Page
You can click the `Other Tools` button in the popup window to open the options page.

![options_page_entrance.png](../images/options_page_entrance.png)

Then you can home page like below:

![options_page_home_page.png](../images/options_page_home_page.png)

### 5.1. Search App
You can just type keyword in the search box, then you will get search results and answer from the search engine.

![options_page_search_result.png](../images/options_page_search_result.png)

### 5.2. More Tools are Coming Soon
We can build many tools in the options page, please wait for the next version.

## 6. Conclusion

This Chrome extension is designed to provide a seamless experience for users, offering a range of features to enhance your browsing experience. By following the steps outlined in this document, you can make the most of the extension's capabilities and enjoy a more efficient and productive browsing experience. If you have any questions or need further assistance, please feel free to reach out to us. We are here to help you make the most of this extension and ensure you have a positive experience. Happy browsing!
