import React, { useState } from "react";
import { Button, Layout, Menu, type MenuProps, Radio } from "antd";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import "./index.css";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import HistoryPanel from "@pages/options/history/components/HistoryPanel";
import intl from "react-intl-universal";

const { Sider } = Layout;

type HistoryType = "Conversations" | "Datasets";

const ConversationsItemKey: HistoryType = "Conversations";
const DatasetsItemKey: HistoryType = "Datasets";

interface HistoryAppProps {
  config: GluonConfigure;
}

const HistoryApp: React.FC<HistoryAppProps> = ({ config }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] =
    useState<HistoryType>(ConversationsItemKey);

  const historyTypeItems: MenuProps["items"] = [
    {
      key: ConversationsItemKey,
      label: intl.get("options_app_history_conversations").d("Conversations"),
    },
    {
      key: DatasetsItemKey,
      label: intl.get("options_app_history_datasets").d("Datasets"),
    },
  ];

  const handleMenuClick = (item: HistoryType) => {
    setSelectedItem(item);
  };

  return (
    <Layout id={"history-app"}>
      <Sider
        id="history-left-sider"
        width={300}
        collapsedWidth={64}
        style={{ height: "auto" }}
        trigger={null}
        collapsible
        collapsed={collapsed}
      >
        <div className="left-sider-title">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: "16px",
              width: 64,
              height: 64,
            }}
          />
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[selectedItem]}
          items={historyTypeItems}
          style={{ borderRight: 0 }}
          onClick={(e) => handleMenuClick(e.key as HistoryType)}
        />
      </Sider>
      <HistoryPanel config={config} historyType={selectedItem} />
    </Layout>
  );
};

export default HistoryApp;
export type { HistoryType };
