import React, { useMemo, useState, useEffect } from "react";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";

import withSuspense from "@src/shared/hoc/withSuspense";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";
import WriterApp from "@pages/options/writer/components/WriterApp/WriterApp";
import SearchApp from "@pages/options/search/components/SearchApp";
import "@pages/options/Options.css";

import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import NavSearch from "@pages/options/components/NavSearch";
import intl from "react-intl-universal";
import {
  FileSearchOutlined,
  CommentOutlined,
  EditOutlined,
  FileTextOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import PreferenceApp from "@pages/options/preference/components/PreferenceApp";
import ChatbotApp from "@pages/options/chatbot/components/ChatbotApp";
import DocumentIntelligenceApp from "@pages/options/document/components/DocumentIntelligenceApp";
import useStorage from "@src/shared/hooks/useStorage";
import configureStorage from "@src/shared/storages/gluonConfig";

const { Header } = Layout;
const MENU_KEYS = {
  CHATBOT: "chatbot",
  SEARCH: "search",
  WRITER: "writer",
  DOCUMENT_INTELLIGENCE: "document_intelligence",
  PREFERENCE: "preference",
};

const getHeaderItems = (config: GluonConfigure): MenuProps["items"] => {
  const items: MenuProps["items"] = [];
  if (config.enableOptionsAppSearch) {
    items.push({
      key: MENU_KEYS.SEARCH,
      label: intl.get("options_app_search").d("Search"),
      icon: <FileSearchOutlined />,
    });
  }
  if (config.enableOptionsAppChatbot) {
    items.push({
      key: MENU_KEYS.CHATBOT,
      label: intl.get("options_app_chatbot").d("Fun Chat"),
      icon: <CommentOutlined />,
    });
  }
  if (config.enableWriting) {
    items.push({
      key: MENU_KEYS.WRITER,
      label: intl.get("options_app_writer").d("Writing"),
      icon: <EditOutlined />,
    });
  }
  items.push({
    key: MENU_KEYS.DOCUMENT_INTELLIGENCE,
    label: intl.get("options_app_document_intelligence").d("Document Intelligence"),
    icon: <FileTextOutlined />,
  });
  items.push({
    key: MENU_KEYS.PREFERENCE,
    label: intl.get("options_app_preference").d("Preference"),
    icon: <SettingOutlined />,
  });
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
  const configStorage = useStorage(configureStorage);
  const effectiveConfig = configStorage || config;
  const [query, setQuery] = useState<string>("");
  const headerItems = useMemo(() => getHeaderItems(effectiveConfig), [effectiveConfig]);
  const defaultSelectedItem = (headerItems[0]?.key as string) || MENU_KEYS.DOCUMENT_INTELLIGENCE;
  const [selectedItem, setSelectedItem] = useState<string>(defaultSelectedItem);
  const [homeKey, setHomeKey] = useState(0);

  useEffect(() => {
    const keys = new Set((headerItems || []).map((item: any) => item?.key));
    if (!keys.has(selectedItem)) {
      setSelectedItem(defaultSelectedItem);
    }
  }, [headerItems, selectedItem, defaultSelectedItem]);

  const clickLogoOrMenuItem = (item: string) => {
    setSelectedItem(item);
    if (item === MENU_KEYS.SEARCH) {
      setQuery("");
    }
  };

  const handleLogoClick = () => {
    setHomeKey((k) => k + 1);
    clickLogoOrMenuItem(defaultSelectedItem);
  };

  return (
    <Layout>
      <Header id="app-header">
        <Logo
          query={query}
          setQuery={setQuery}
          onClick={handleLogoClick}
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
      {selectedItem === MENU_KEYS.CHATBOT && <ChatbotApp key={homeKey} config={effectiveConfig} />}
      {selectedItem === MENU_KEYS.SEARCH && (
        <SearchApp key={homeKey} config={effectiveConfig} query={query} onQueryChange={setQuery} />
      )}
      {selectedItem === MENU_KEYS.WRITER && <WriterApp key={homeKey} config={effectiveConfig} />}
      {selectedItem === MENU_KEYS.DOCUMENT_INTELLIGENCE && <DocumentIntelligenceApp key={homeKey} />}
      {selectedItem === MENU_KEYS.PREFERENCE && <PreferenceApp key={homeKey} />}
    </Layout>
  );
};

export default withErrorBoundary(
  withSuspense(Options, <div> Loading ... </div>),
  <div> Error Occur </div>,
);
