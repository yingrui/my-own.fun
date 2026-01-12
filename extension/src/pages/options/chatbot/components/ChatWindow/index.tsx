import React, { useState } from "react";
import { Layout } from "antd";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import "./index.css";
import Agent from "@src/shared/agents/core/Agent";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import ChatConversation from "@src/shared/components/ChatConversation";
import _ from "lodash";
import Greeting from "@pages/options/chatbot/components/Greeting";

interface ChatWindowProps {
  config: GluonConfigure;
  agent: Agent;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ config, agent }) => {
  const [question, setQuestion] = useState<string>("");
  const isNewConversation = () => _.isEmpty(question);

  return (
    <Layout style={{ backgroundColor: "white" }}>
      {isNewConversation() && (
        <Greeting
          onQuestionChange={setQuestion}
          agent={agent as DelegateAgent}
          enableClearCommand={false}
        />
      )}
      {!isNewConversation() && (
        <ChatConversation
          agent={agent as DelegateAgent}
          question={question}
          enableClearCommand={false}
        />
      )}
    </Layout>
  );
};

export default ChatWindow;
