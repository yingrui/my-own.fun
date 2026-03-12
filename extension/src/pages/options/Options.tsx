import React, { useState } from "react";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";

import withSuspense from "@src/shared/hoc/withSuspense";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";
import WriterApp from "@pages/options/writer/components/WriterApp/WriterApp";
import SearchApp from "@pages/options/search/components/SearchApp";
import "@pages/options/Options.css";

import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import NavSearch from "@pages/options/components/NavSearch";
import MoreComing from "@pages/options/components/MoreComing";
import intl from "react-intl-universal";
import {
  MoreOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import PreferenceApp from "@pages/options/preference/components/PreferenceApp";
import ChatbotApp from "@pages/options/chatbot/components/ChatbotApp";
import DocumentIntelligenceApp from "@pages/options/document/components/DocumentIntelligenceApp";

const { Header } = Layout;
const MENU_KEYS = {
  CHATBOT: "chatbot",
  SEARCH: "search",
  WRITER: "writer",
  DOCUMENT_INTELLIGENCE: "document_intelligence",
  MORE: "more",
  PREFERENCE: "preference",
};

const getHeaderItems = (config: GluonConfigure): MenuProps["items"] => {
  const items: MenuProps["items"] = [];
  if (config.enableOptionsAppSearch) {
    items.push({
      key: MENU_KEYS.SEARCH,
      label: intl.get("options_app_search").d("Search"),
    });
  }
  if (config.enableOptionsAppChatbot) {
    items.push({
      key: MENU_KEYS.CHATBOT,
      label: intl.get("options_app_chatbot").d("Fun Chat"),
    });
  }
  if (config.enableWriting) {
    items.push({
      key: MENU_KEYS.WRITER,
      label: intl.get("options_app_writer").d("Writing"),
    });
  }
  items.push({
    key: MENU_KEYS.DOCUMENT_INTELLIGENCE,
    label: intl.get("options_app_document_intelligence").d("Document Intelligence"),
  });
  const more = {
    key: "dropdown_more",
    label: intl.get("options_app_dropdown_more").d("More"),
    children: [
      {
        key: MENU_KEYS.PREFERENCE,
        label: intl.get("options_app_preference").d("Preference"),
        icon: <SettingOutlined />,
      },
      {
        key: MENU_KEYS.MORE,
        label: intl.get("options_app_more").d("Coming Soon"),
        icon: <MoreOutlined />,
      },
    ],
  };
  items.push(more);
  return items;
};

interface OptionsProps extends Record<string, unknown> {
  config: GluonConfigure;
}

const Logo: React.FC<{
  onClick: () => void;
  query: string;
  setQuery: (query: string) => void;
}> = ({ onClick, query, setQuery }) => (
  <div className="logo">
    <div className="logo-and-name" onClick={onClick}>
      <img src="/icons/logo.png" alt="Logo" />
      <h6>{intl.get("assistant_name").d("myFun")}</h6>
    </div>
    {!!query && <NavSearch query={query} onQueryChange={setQuery} />}
  </div>
);

const Options: React.FC<OptionsProps> = ({ config }) => {
  const [query, setQuery] = useState<string>("");
  const headerItems = getHeaderItems(config);
  const defaultSelectedItem = headerItems[0]?.key as string;
  const [selectedItem, setSelectedItem] = useState<string>(defaultSelectedItem);

  const clickLogoOrMenuItem = (item: string) => {
    setSelectedItem(item);
    if (item === MENU_KEYS.SEARCH) {
      setQuery("");
    }
  };

  return (
    <Layout>
      <Header id="app-header">
        <Logo
          query={query}
          setQuery={setQuery}
          onClick={() => clickLogoOrMenuItem(defaultSelectedItem)}
        />
        <div className="nav-menus">
          <Menu
            mode="horizontal"
            defaultSelectedKeys={[defaultSelectedItem]}
            selectedKeys={[selectedItem]}
            items={getHeaderItems(config)}
            onClick={(e) => clickLogoOrMenuItem(e.key)}
          />
        </div>
      </Header>
      {selectedItem === MENU_KEYS.CHATBOT && <ChatbotApp config={config} />}
      {selectedItem === MENU_KEYS.SEARCH && (
        <SearchApp config={config} query={query} onQueryChange={setQuery} />
      )}
      {selectedItem === MENU_KEYS.WRITER && <WriterApp config={config} />}
      {selectedItem === MENU_KEYS.DOCUMENT_INTELLIGENCE && <DocumentIntelligenceApp />}
      {selectedItem === MENU_KEYS.PREFERENCE && <PreferenceApp />}
      {selectedItem === MENU_KEYS.MORE && <MoreComing />}
    </Layout>
  );
};

export default withErrorBoundary(
  withSuspense(Options, <div> Loading ... </div>),
  <div> Error Occur </div>,
);
