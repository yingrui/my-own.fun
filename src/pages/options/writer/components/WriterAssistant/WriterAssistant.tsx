import { Button, Layout, Typography } from "antd";
import React, { useRef, useState } from "react";

import { CloseOutlined } from "@ant-design/icons";
import WriterContext from "@pages/options/writer/context/WriterContext";
import styles from "@pages/sidepanel/SidePanel.module.scss";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import ChatConversation, {
  ChatConversationRef,
} from "@src/shared/components/ChatConversation";
import intl from "react-intl-universal";
import "./WriterAssistant.css";

const { Sider } = Layout;
const { Text } = Typography;

interface WriterAssistantProps {
  context: WriterContext;
  agent: DelegateAgent;
}

const WriterAssistant: React.FC<WriterAssistantProps> = ({
  context,
  agent,
}) => {
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const chatRef = useRef<ChatConversationRef>();

  if (!context.getConfig().apiKey || !context.getConfig().baseURL) {
    return (
      <div className={styles.warning}>
        <Text>
          {intl
            .get("miss_required_settings")
            .d("Please complete the API configuration first.")}
        </Text>
      </div>
    );
  }

  return (
    <Sider
      id="writer-right-sider"
      width={400}
      collapsedWidth={36}
      trigger={null}
      collapsible
      collapsed={chatCollapsed}
    >
      <div className="chat">
        <div className="chat-sider-header">
          {chatCollapsed ? null : (
            <>
              <img src="/icons/logo.png" />
              <h6>
                {intl.get("options_app_writer_assistant_header").d("Chat")}
              </h6>
            </>
          )}
          <Button
            type="text"
            icon={
              chatCollapsed ? <img src="/icons/logo.png" /> : <CloseOutlined />
            }
            onClick={() => setChatCollapsed(!chatCollapsed)}
            style={{
              fontSize: "16px",
              width: 36,
              height: 64,
              float: "right",
            }}
          />
        </div>
        <div
          className="chat-sider-body"
          style={{
            display: chatCollapsed ? "none" : "flex",
          }}
        >
          <ChatConversation
            ref={chatRef}
            config={context.getConfig()}
            agent={agent}
            enableClearCommand={true}
          />
        </div>
      </div>
    </Sider>
  );
};

export default WriterAssistant;
