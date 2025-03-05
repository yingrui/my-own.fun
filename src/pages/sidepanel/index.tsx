import React from "react";
import { createRoot } from "react-dom/client";
import "@pages/sidepanel/index.css";
import refreshOnUpdate from "virtual:reload-on-update-in-view";
import configureStorage from "@root/src/shared/storages/gluonConfig";
import SidePanel from "@pages/sidepanel/SidePanel";
import AgentFactory from "./agents/AgentFactory";
import { initI18n, locale } from "@src/shared/utils/i18n";
import intl from "react-intl-universal";
import ChatMessage from "@src/shared/agents/core/ChatMessage";

refreshOnUpdate("pages/sidepanel");

function getInitialSystemMessage(language: string): string {
  return intl.get("myfun_initial_system_prompt", { language: language })
    .d(`As an assistant or chrome copilot named myFun.
You can decide to call different tools or directly answer questions in ${language}, should not add assistant in answer.
Output format should be in markdown format, and use mermaid format for diagram generation.`);
}

function getInitialMessages(language: string): ChatMessage[] {
  const messages = [
    new ChatMessage({
      role: "system",
      content: getInitialSystemMessage(language),
    }),
    new ChatMessage({
      role: "assistant",
      content: intl
        .get("myfun_greeting")
        .d("Hello! How can I assist you today?"),
    }),
  ];
  return messages;
}

function init() {
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  configureStorage.get().then((config) => {
    initI18n(config.language).then(() => {
      const language = intl.get(locale(config.language)).d("English");
      const initMessages = getInitialMessages(language);
      const agent = new AgentFactory().create(config, initMessages);
      root.render(<SidePanel agent={agent} initMessages={initMessages} />);
    });
  });
}

init();
