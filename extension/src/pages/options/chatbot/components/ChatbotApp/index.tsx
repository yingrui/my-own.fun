import React, { useState } from "react";
import { Layout, Typography } from "antd";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import ChatWindow from "@pages/options/chatbot/components/ChatWindow";
import "./index.css";
import AgentFactory from "@pages/options/chatbot/agents/AgentFactory";
import intl from "react-intl-universal";
import AppShell from "@src/shared/components/AppShell";

interface ChatbotAppProps {
  config: GluonConfigure;
}

const ChatbotApp: React.FC<ChatbotAppProps> = ({ config }) => {
  const [collapsed, setCollapsed] = useState(true);
  const agent = new AgentFactory().create(config);

  return (
    <AppShell
      siderId="chatbot-left-sider"
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed(!collapsed)}
      sider={
        collapsed ? null : (
          <div className="chatbot-sider-content">
            <Typography.Title level={5} className="chatbot-sider-title">
              {intl.get("options_app_chatbot").d("Fun Chat")}
            </Typography.Title>
            <Typography.Paragraph className="chatbot-sider-desc">
              {intl.get("options_search_textarea_placeholder").d("Hit Enter to search.")}
            </Typography.Paragraph>
            <div className="chatbot-sider-tip">
              <strong>Tip</strong>: {intl.get("tooltip_assistant_shortcut").d("is glad to help you, type `Alt + Enter` can also open side panel.")}
            </div>
          </div>
        )
      }
      content={
        <Layout className={"chatbot-main"}>
          <Layout className={"chatbot-conversation"}>
          <ChatWindow config={config} agent={agent} />
          </Layout>
        </Layout>
      }
    />
  );
};

export default ChatbotApp;
