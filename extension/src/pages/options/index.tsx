import React from "react";
import { createRoot } from "react-dom/client";
import "@pages/options/index.css";
import Options from "@pages/options/Options";
import refreshOnUpdate from "virtual:reload-on-update-in-view";
import configureStorage from "@root/src/shared/storages/gluonConfig";
import { initI18n } from "@src/shared/utils/i18n";
import intl from "react-intl-universal";
import "@src/shared/theme/theme.css";
import AppThemeProvider from "@src/shared/theme/AppThemeProvider";
import { suppressLangChainMergeWarnings } from "@src/shared/utils/suppressLangChainWarnings";

refreshOnUpdate("pages/options");

function init() {
  suppressLangChainMergeWarnings();
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  configureStorage.get().then((config) => {
    initI18n(config.language).then(() => {
      document.title = intl.get("assistant_name").d("myFun");
      root.render(
        <AppThemeProvider>
          <Options config={config} />
        </AppThemeProvider>,
      );
    });
  });
}

init();
