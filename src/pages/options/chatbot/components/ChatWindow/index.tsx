import React from "react";
import { Layout } from "antd";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import "./index.css";
import Agent from "@src/shared/agents/core/Agent";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import ChatConversation from "@src/shared/components/ChatConversation";

interface ChatWindowProps {
  config: GluonConfigure;
  agent: Agent;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ config, agent }) => {
  return (
    <Layout style={{ backgroundColor: "white" }}>
      <ChatConversation config={config} agent={agent as DelegateAgent} />
    </Layout>
  );
};

export default ChatWindow;
