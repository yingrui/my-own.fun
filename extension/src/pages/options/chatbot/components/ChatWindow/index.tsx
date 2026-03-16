import React, { useState } from "react";
import { Layout } from "antd";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import type { Artifact } from "@src/shared/artifacts/types";
import "./index.css";
import type { ChatSession, SessionMessage } from "@src/shared/langgraph/runtime/types";
import ChatConversation from "@src/shared/components/ChatConversation";
import Greeting from "@pages/options/chatbot/components/Greeting";

interface ChatWindowProps {
  config: GluonConfigure;
  agent: ChatSession;
  messages: SessionMessage[];
  artifactsByMessageId?: Record<string, Artifact[]>;
  onArtifactClick?: (artifactId: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  config,
  agent,
  messages,
  artifactsByMessageId = {},
  onArtifactClick,
}) => {
  const [question, setQuestion] = useState<string>("");
  const hasMessages = messages.length > 0;
  const showGreeting = !hasMessages && !question;

  return (
    <Layout className="chat-window-layout">
      {showGreeting && (
        <Greeting
          onQuestionChange={setQuestion}
          agent={agent}
          enableClearCommand={false}
        />
      )}
      {(hasMessages || question) && (
        <ChatConversation
          agent={agent}
          question={question || undefined}
          enableClearCommand={false}
          artifactsByMessageId={artifactsByMessageId}
          onArtifactClick={onArtifactClick}
        />
      )}
    </Layout>
  );
};

export default ChatWindow;
