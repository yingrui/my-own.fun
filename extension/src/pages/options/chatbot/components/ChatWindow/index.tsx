import React, { useState } from "react";
import { Layout } from "antd";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import "./index.css";
import type { ChatSession } from "@src/shared/langgraph/runtime/types";
import ChatConversation from "@src/shared/components/ChatConversation";
import _ from "lodash";
import Greeting from "@pages/options/chatbot/components/Greeting";

interface ChatWindowProps {
  config: GluonConfigure;
  agent: ChatSession;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ config, agent }) => {
  const [question, setQuestion] = useState<string>("");
  const isNewConversation = () => _.isEmpty(question);

  return (
    <Layout style={{ backgroundColor: "white" }}>
      {isNewConversation() && (
        <Greeting
          onQuestionChange={setQuestion}
          agent={agent}
          enableClearCommand={false}
        />
      )}
      {!isNewConversation() && (
        <ChatConversation
          agent={agent}
          question={question}
          enableClearCommand={false}
        />
      )}
    </Layout>
  );
};

export default ChatWindow;
