import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */
const manifest = {
  manifest_version: 3,
  // default_locale: 'en',
  /**
   * if you want to support multiple languages, you can use the following reference
   * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
   */
  name: "趣趣 myFun",
  version: packageJson.version,
  description:
    "The my-own.fun is your personal frontend AI agent that run as an extension",
  host_permissions: ["<all_urls>"],
  permissions: [
    "storage",
    "unlimitedStorage",
    "sidePanel",
    "scripting",
    "activeTab",
    "contextMenus",
    "history",
  ],
  background: {
    service_worker: "src/index.js",
  },
  side_panel: {
    default_path: "src/pages/sidepanel/index.html",
  },
  options_page: "src/pages/options/index.html",
  action: {
    default_popup: "src/pages/popup/index.html",
    default_icon: "icons/logo.png",
  },
  chrome_url_overrides: {
    newtab: "src/pages/options/index.html",
  },
  icons: {
    128: "icons/logo.png",
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*", "<all_urls>"],
      js: ["src/pages/contentInjected/index.js"],
    },
    {
      matches: ["http://*/*", "https://*/*", "<all_urls>"],
      js: ["src/pages/contentUI/index.js"],
    },
  ],
  web_accessible_resources: [
    {
      resources: ["assets/js/*.js", "assets/css/*.css", "icons/*.png"],
      matches: ["*://*/*"],
    },
  ],
};

export default manifest;
