import "@pages/sidepanel/index.css";
import SidePanel from "@pages/sidepanel/SidePanel";
import configureStorage from "@root/src/shared/storages/gluonConfig";
import { initI18n } from "@src/shared/utils/i18n";
import { createRoot } from "react-dom/client";
import refreshOnUpdate from "virtual:reload-on-update-in-view";
import AgentFactory from "./agents/AgentFactory";

refreshOnUpdate("pages/sidepanel");

function init() {
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  configureStorage.get().then((config) => {
    initI18n(config.language).then(() => {
      const agent = new AgentFactory().create(config);
      root.render(<SidePanel agent={agent} />);
    });
  });
}

init();
