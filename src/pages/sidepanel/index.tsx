import React from "react";
import { createRoot } from "react-dom/client";
import "@pages/sidepanel/index.css";
import refreshOnUpdate from "virtual:reload-on-update-in-view";
import configureStorage from "@root/src/shared/storages/gluonConfig";
import SidePanel from "@pages/sidepanel/SidePanel";
import AgentFactory from "./agents/AgentFactory";
import { initI18n, locale } from "@src/shared/utils/i18n";
import intl from "react-intl-universal";

refreshOnUpdate("pages/sidepanel");

function init() {
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  configureStorage.get().then((config) => {
    initI18n(config.language).then(() => {
      const language = intl.get(locale(config.language)).d("English");
      const initMessages = AgentFactory.getInitialMessages(language);
      const agent = new AgentFactory().create(config, initMessages);
      root.render(<SidePanel agent={agent} initMessages={initMessages} />);
    });
  });
}

init();
