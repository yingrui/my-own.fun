import React, { useState } from "react";
import { Button, Layout } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import ChatWindow from "@pages/options/chatbot/components/ChatWindow";
import "./index.css";
import AgentFactory from "@pages/options/chatbot/agents/AgentFactory";

const { Sider } = Layout;

interface ChatbotAppProps {
  config: GluonConfigure;
}

const ChatbotApp: React.FC<ChatbotAppProps> = ({ config }) => {
  const [collapsed, setCollapsed] = useState(true);
  const agent = new AgentFactory().create(config);

  return (
    <Layout>
      <Sider
        id="chatbot-left-sider"
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
      </Sider>
      <Layout>
        <ChatWindow config={config} agent={agent} />
      </Layout>
    </Layout>
  );
};

export default ChatbotApp;
