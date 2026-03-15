import "@pages/sidepanel/index.css";
import SidePanel from "@pages/sidepanel/SidePanel";
import configureStorage from "@root/src/shared/storages/gluonConfig";
import { initI18n } from "@src/shared/utils/i18n";
import { suppressLangChainMergeWarnings } from "@src/shared/utils/suppressLangChainWarnings";
import { createRoot } from "react-dom/client";
import refreshOnUpdate from "virtual:reload-on-update-in-view";
import AgentFactory from "./agents/AgentFactory";
import "@src/shared/theme/theme.css";
import AppThemeProvider from "@src/shared/theme/AppThemeProvider";

refreshOnUpdate("pages/sidepanel");

function init() {
  suppressLangChainMergeWarnings();
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  configureStorage.get().then((config) => {
    initI18n(config.language).then(() => {
      const agent = new AgentFactory().create(config);
      root.render(
        <AppThemeProvider>
          <SidePanel agent={agent} />
        </AppThemeProvider>,
      );
    });
  });
}

init();
