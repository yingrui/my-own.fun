import useStorage from "@root/src/shared/hooks/useStorage";
import configureStorage from "@root/src/shared/storages/gluonConfig";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import ChatConversation, {
  ChatConversationRef,
} from "@src/shared/components/ChatConversation";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";
import withSuspense from "@src/shared/hoc/withSuspense";
import { installContentScriptCommandListener } from "@src/shared/utils";
import { Typography } from "antd";
import { useEffect, useRef } from "react";
import intl from "react-intl-universal";
import styles from "./SidePanel.module.scss";

const { Text } = Typography;

function SidePanel(props: Record<string, unknown>) {
  const configStorage = useStorage(configureStorage);
  const agent = props.agent as DelegateAgent;
  const chatRef = useRef<ChatConversationRef>();

  useEffect(() => {
    // Create command handler for events from content script
    async function handleCommandFromContentScript(
      action: string,
      args: any,
      userInput: string,
    ) {
      if (!chatRef.current) {
        console.log("Chat conversation is not ready yet.");
      }
      if (!chatRef.current || chatRef.current.generating) {
        return;
      }

      const result = await chatRef.current.generateReply(
        userInput,
        async () => {
          return agent.executeCommand(
            [{ name: action, arguments: args }],
            new ChatMessage({ role: "user", content: userInput }),
          );
        },
      );
      // TODO: post process the result by action
      // If the action returns JSON string, you need to parse it before use it.
    }
    installContentScriptCommandListener(handleCommandFromContentScript);
  }, []);

  if (!configStorage.apiKey || !configStorage.baseURL) {
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
    <>
      <ChatConversation
        ref={chatRef}
        config={configStorage}
        agent={agent}
        enableClearCommand={true}
      />
    </>
  );
}

export default withErrorBoundary(
  withSuspense(SidePanel, <div> Loading ... </div>),
  <div> Error Occur </div>,
);
