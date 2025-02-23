import React, { useEffect, useState, useRef } from "react";
import { Layout, Spin } from "antd";

import WriterWorkspace from "@pages/options/writer/components/WriterWorkspace/WriterWorkspace";
import WriterAssistant from "@pages/options/writer/components/WriterAssistant/WriterAssistant";
import WriterContext from "@pages/options/writer/context/WriterContext";
import WriterAgentFactory from "@pages/options/writer/agents/WriterAgentFactory";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import intl from "react-intl-universal";
import DocumentRepository from "@pages/options/writer/repositories/DocumentRepository";
import DelegateAgent from "@src/shared/agents/DelegateAgent";

interface WriterAppProps {
  config: GluonConfigure;
}

const WriterApp: React.FC<WriterAppProps> = ({ config }) => {
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const contextRef = useRef(new WriterContext(config));
  const agentRef = useRef(
    new WriterAgentFactory().create(config, contextRef.current, []),
  );
  const initMessages = [
    new ChatMessage({
      role: "system",
      content: `As an assistant named Gru. You can help users writing with given information.`,
    }),
    new ChatMessage({
      role: "assistant",
      content: intl
        .get("options_app_writer_assistant_greeting")
        .d("Ask me anything about writing!"),
      name: "Gru",
    }),
  ];

  useEffect(() => {
    const repository = new DocumentRepository();
    repository.load().then((doc) => {
      contextRef.current.setTitle(doc.title);
      contextRef.current.setContent(doc.content);
      setDocumentLoaded(true);
    });
  }, []);

  return (
    <Layout>
      {documentLoaded && (
        <>
          <WriterWorkspace
            context={contextRef.current}
            agent={agentRef.current}
          />
          <WriterAssistant
            context={contextRef.current}
            initMessages={initMessages}
            agent={agentRef.current}
          ></WriterAssistant>
        </>
      )}
      {!documentLoaded && (
        <div
          style={{
            justifyContent: "center",
            display: "flex",
            alignItems: "center",
            height: "100vh",
            backgroundColor: "#fff",
          }}
        >
          <Spin size="large" />
        </div>
      )}
    </Layout>
  );
};

export default WriterApp;
