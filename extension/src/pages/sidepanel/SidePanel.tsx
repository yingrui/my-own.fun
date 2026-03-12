import useStorage from "@root/src/shared/hooks/useStorage";
import configureStorage from "@root/src/shared/storages/gluonConfig";
import type { ChatSession } from "@src/shared/langgraph/runtime/types";
import ChatConversation, {
  ChatConversationRef,
} from "@src/shared/components/ChatConversation";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";
import withSuspense from "@src/shared/hoc/withSuspense";
import { installContentScriptCommandListener } from "@src/shared/utils";
import { Button, Typography } from "antd";
import { useEffect, useRef } from "react";
import intl from "react-intl-universal";
import styles from "./SidePanel.module.scss";

const { Text } = Typography;

function SidePanel(props: Record<string, unknown>) {
  const configStorage = useStorage(configureStorage);
  const agent = props.agent as ChatSession;
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
          return agent.executeCommand(action, args, userInput);
        },
      );
      // TODO: post process the result by action
      // If the action returns JSON string, you need to parse it before use it.
    }
    installContentScriptCommandListener(handleCommandFromContentScript);
  }, []);

  if (!configStorage.apiKey || !configStorage.baseURL) {
    const openOptions = () => chrome.runtime.openOptionsPage();
    return (
      <div className={styles.warning}>
        <Text>
          {intl
            .get("miss_required_settings")
            .d("Please complete the API configuration first.")}
        </Text>
        <Button type="primary" size="small" onClick={openOptions}>
          {intl.get("options_app_preference").d("Preference")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <ChatConversation ref={chatRef} agent={agent} enableClearCommand={true} />
    </>
  );
}

export default withErrorBoundary(
  withSuspense(SidePanel, <div> Loading ... </div>),
  <div> Error Occur </div>,
);
