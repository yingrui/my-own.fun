import React, { useEffect, useMemo, useState } from "react";
import { Layout, Typography } from "antd";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import type { SessionMessage } from "@src/shared/langgraph/runtime/types";
import ChatWindow from "@pages/options/chatbot/components/ChatWindow";
import ArtifactPanel from "@src/shared/components/ArtifactPanel";
import { extractArtifacts } from "@src/shared/artifacts";
import "./index.css";
import AgentFactory from "@pages/options/chatbot/agents/AgentFactory";
import intl from "react-intl-universal";
import AppShell from "@src/shared/components/AppShell";

interface ChatbotAppProps {
  config: GluonConfigure;
}

const ChatbotApp: React.FC<ChatbotAppProps> = ({ config }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const agent = useMemo(() => new AgentFactory().create(config), [config]);
  const artifacts = useMemo(() => extractArtifacts(messages), [messages]);
  const artifactsByMessageId = useMemo(() => {
    const map: Record<string, typeof artifacts> = {};
    for (const a of artifacts) {
      if (!map[a.messageId]) map[a.messageId] = [];
      map[a.messageId].push(a);
    }
    return map;
  }, [artifacts]);

  useEffect(() => {
    setMessages(agent.getState().messages);
    const unsubscribe = agent.onStateChange((state) => {
      setMessages(state.messages);
    });
    return () => unsubscribe();
  }, [agent]);

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
        <Layout className={`chatbot-main${artifacts.length > 0 ? " chatbot-main--with-artifacts" : ""}`}>
          <Layout className={"chatbot-conversation"}>
            <ChatWindow config={config} agent={agent} artifactsByMessageId={artifactsByMessageId} />
          </Layout>
          {artifacts.length > 0 && (
            <div className={"chatbot-artifact-panel"}>
              <ArtifactPanel messages={messages} />
            </div>
          )}
        </Layout>
      }
    />
  );
};

export default ChatbotApp;
