import { useRef, useState, useEffect } from "react";
import withSuspense from "@src/shared/hoc/withSuspense";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";
import { useScrollAnchor } from "./hooks/use-scroll-anchor";
import { Mentions, Typography } from "antd";
import styles from "./SidePanel.module.scss";

import Message from "./components/Message";
import GluonMesonAgent from "./agents/GluonMesonAgent";
import { delay } from "@pages/sidepanel/utils";
import useStorage from "@root/src/shared/hooks/useStorage";
import configureStorage from "@root/src/shared/storages/gluonConfig";
import type { MentionsRef } from "antd/lib/mentions";

const { Text } = Typography;
function SidePanel() {
  const configStorage = useStorage(configureStorage);
  const mentionRef = useRef<MentionsRef>();
  const [text, setText] = useState<string>();
  const [currentText, setCurrentText] = useState<string>();
  const [generating, setGenerating] = useState<boolean>();
  const { scrollRef, scrollToBottom, messagesRef } = useScrollAnchor();
  const commandRef = useRef<boolean>();

  const [messages, setList] = useState<ChatMessage[]>([
    {
      role: "system",
      content:
        "You're an assistant, please direct answer questions, should not add assistant in answer.",
    },
    { role: "assistant", content: "Hello! How can I assist you today?" },
  ]);

  useEffect(() => {
    const focus = () => {
      if (mentionRef.current) {
        mentionRef.current.focus();
      }
    };
    focus();
    window.addEventListener("focus", focus);
    return () => {
      window.removeEventListener("focus", focus);
    };
  }, []);

  if (!configStorage.apiKey || !configStorage.baseURL) {
    return (
      <div className={styles.chat} style={{ justifyContent: "center" }}>
        <Text style={{ textAlign: "center" }}>
          Please complete the configuration first.
        </Text>
      </div>
    );
  }

  const agent = new GluonMesonAgent();

  chrome.storage.session.onChanged.addListener((changes) => {
    chrome.storage.session.get().then((data) => {
      // TODO: Handle the command from content script
      const command_from_content_script = data["command_from_content_script"];
      if (command_from_content_script) {
        console.log("Received command", command_from_content_script);
        handleCommandFromContentScript(
          command_from_content_script.tool,
          command_from_content_script.args,
          command_from_content_script.userInput,
        );
      }
    });
  });

  async function handleCommandFromContentScript(
    toolName: string,
    args: any,
    userInput: string,
  ) {
    if (generating) {
      return;
    }
    generateReply(userInput, () => agent.findAgentToExecute(toolName, args));
  }

  async function handleSubmit() {
    if (generating) {
      return;
    }
    if (!text || text.trim() === "") {
      setText("");
      return;
    }
    generateReply(text, () => agent.chat(messages));
  }

  async function generateReply(
    userInput: string,
    generate_func: () => Promise<any>,
  ) {
    setGenerating(true);
    try {
      setText("");
      appendMessage("user", userInput);

      const stream = await generate_func();

      let message = "";

      for await (const chunk of stream) {
        const finishReason = chunk.choices[0]?.finish_reason;
        const content = chunk.choices[0]?.delta?.content;
        message = message + content;
        setCurrentText(message);
        setTimeout(() => {
          scrollToBottom();
        });
      }

      appendMessage("assistant", message);
      setCurrentText("");
    } finally {
      setGenerating(false);
    }

    setTimeout(() => {
      scrollToBottom();
    });
  }

  function appendMessage(role: ChatMessage["role"], content: string) {
    messages.push({ role: role, content: content });
    setList([...messages]);
  }

  const handleSearchChange = async () => {
    commandRef.current = true;
    await delay(500);
    commandRef.current = false;
  };

  async function keypress(e: any) {
    if (e.key == "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!commandRef.current) {
        handleSubmit();
      }
    }
  }

  return (
    <div className={styles.chat}>
      <div className={styles.chatList}>
        <div>
          {messages
            .filter((msg) => msg.role != "system")
            .map((msg, i) => (
              <Message key={i} role={msg.role} content={msg.content}></Message>
            ))}
          {generating && (
            <Message role="assistant" content={currentText}></Message>
          )}
          <div className="helper" ref={messagesRef}></div>
        </div>
      </div>

      <div className={styles.form}>
        <Mentions
          ref={mentionRef}
          onSelect={handleSearchChange}
          onKeyUp={keypress}
          prefix={"/"}
          value={text}
          options={agent.getCommandOptions()}
          placeholder="Hit Enter to send the message..."
          onChange={(value) => {
            setText(value);
          }}
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </div>
    </div>
  );
}

export default withErrorBoundary(
  withSuspense(SidePanel, <div> Loading ... </div>),
  <div> Error Occur </div>,
);
