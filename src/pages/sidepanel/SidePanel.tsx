import { useRef, useState, useEffect } from "react";
import withSuspense from "@src/shared/hoc/withSuspense";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";
import { useScrollAnchor } from "@src/shared/hooks/use-scroll-anchor";
import { Mentions, Typography } from "antd";
import styles from "./SidePanel.module.scss";

import Message from "@src/shared/components/Message";

import DelegateAgent from "@src/shared/agents/DelegateAgent";
import { delay, installContentScriptCommandListener } from "@src/shared/utils";
import useStorage from "@root/src/shared/hooks/useStorage";
import configureStorage from "@root/src/shared/storages/gluonConfig";
import type { MentionsRef } from "antd/lib/mentions";
import type { MentionProps } from "antd";
import intl from "react-intl-universal";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import SensitiveTopicError from "@src/shared/agents/core/errors/SensitiveTopicError";
import Thought from "@src/shared/agents/core/Thought";

const { Text } = Typography;

type PrefixType = "@" | "/";

function SidePanel(props: Record<string, unknown>) {
  const configStorage = useStorage(configureStorage);
  const mentionRef = useRef<MentionsRef>();
  const [text, setText] = useState<string>();
  const [prefix, setPrefix] = useState<PrefixType>("@");
  const [currentText, setCurrentText] = useState<string>();
  const [generating, setGenerating] = useState<boolean>();
  const { scrollRef, scrollToBottom, messagesRef } = useScrollAnchor();
  const commandRef = useRef<boolean>();
  const inputMethodRef = useRef<boolean>(false);
  const agent = props.agent as DelegateAgent;
  const initMessages = props.initMessages as ChatMessage[];
  const [messages, setList] = useState<ChatMessage[]>([...initMessages]);

  function checkMessages() {
    // TODO: need to know why the messages are not the same with agent conversation
    if (messages.length > agent.getConversation().getMessages().length) {
      messages.length = 0;
      agent
        .getConversation()
        .getMessages()
        .forEach((msg) => {
          messages.push(msg);
        });
    }
  }

  useEffect(() => {
    // Create command handler for events from content script
    async function handleCommandFromContentScript(
      action: string,
      args: any,
      userInput: string,
    ) {
      if (generating) {
        return;
      }

      checkMessages();
      const result = await generateReply(userInput, async () => {
        return agent.executeCommand(
          [{ name: action, arguments: args }],
          new ChatMessage({ role: "user", content: userInput }),
        );
      });
      // TODO: post process the result by action
      // If the action returns JSON string, you need to parse it before use it.
    }
    installContentScriptCommandListener(handleCommandFromContentScript);

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

  async function handleSubmit() {
    if (generating) {
      return;
    }
    if (!text || text.trim() === "") {
      setText("");
      return;
    }
    // when command is clear, then clear the chat history
    if (
      text.startsWith("/clear") ||
      text.startsWith("/c") ||
      text.startsWith("/cl")
    ) {
      const cloneInitMessages = [...initMessages];
      agent.getConversation().reset(cloneInitMessages);
      messages.length = 0;
      setList(cloneInitMessages);
      setText("");
      return;
    }
    const message = await generateReply(text, () =>
      agent.chat(messages[messages.length - 1]),
    );
  }

  function handleError(e) {
    if (e instanceof SensitiveTopicError) {
      return intl.get("sensitive_topic").d("Sensitive topic detected.");
    } else {
      return e.message;
    }
  }

  async function generateReply(
    userInput: string,
    generate_func: () => Promise<Thought>,
  ): Promise<string> {
    setGenerating(true);
    let message = "";
    try {
      setText("");
      if (userInput) {
        appendMessage("user", userInput);
      }

      try {
        agent.onMessageChange((msg) => {
          setCurrentText(msg);
          setTimeout(() => {
            scrollToBottom();
          });
        });
        const thought = await generate_func();
        message = await thought.getMessage();
      } catch (e) {
        message = handleError(e);
      }

      appendMessage("assistant", message);
      setCurrentText("");
    } finally {
      setGenerating(false);
    }

    setTimeout(() => {
      scrollToBottom();
    }, 100);
    return message;
  }

  function appendMessage(role: ChatMessage["role"], content: string) {
    let name = "";
    if (role === "user") {
      name = "You";
    } else if (role === "assistant") {
      name = agent.getName();
    }

    const message = new ChatMessage({ role, content, name });
    messages.push(message);
    setList([...messages]);
  }

  const handleSearchChange = async () => {
    commandRef.current = true;
    await delay(200);
    commandRef.current = false;
  };

  async function onKeyDown(e: any) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      inputMethodRef.current = e.keyCode !== 13;
    }
  }

  async function keypress(e: any) {
    if (e.key == "Enter" && e.keyCode == 13 && !e.shiftKey) {
      e.preventDefault();
      if (!commandRef.current && !inputMethodRef.current) {
        handleSubmit();
      }
    }
  }

  const onSearch: MentionProps["onSearch"] = (_, newPrefix) => {
    setPrefix(newPrefix as PrefixType);
  };

  function getCommandOptions() {
    if (prefix === "@") {
      return agent.getAgentOptions();
    }

    if (prefix === "/") {
      const options = agent.getCommandOptions();
      options.push({ value: "clear", label: "/clear" }); // add clear command
      return options;
    }
  }

  return (
    <div className={styles.chat}>
      <div className={styles.chatList}>
        <div>
          {messages
            .filter((msg) => msg.role != "system")
            .map((msg, i) => (
              <Message
                key={i}
                index={i}
                role={msg.role}
                content={msg.content}
                interaction={
                  msg.role === "assistant"
                    ? agent.getConversation().getInteraction(msg)
                    : undefined
                }
                name={msg.name}
              ></Message>
            ))}
          {generating && (
            <Message
              role="assistant"
              name={agent.getName()}
              interaction={agent.getConversation().getCurrentInteraction()}
              content={currentText}
              loading
            ></Message>
          )}
          <div className="helper" ref={messagesRef}></div>
        </div>
      </div>

      <div className={styles.form}>
        <Mentions
          ref={mentionRef}
          onSelect={handleSearchChange}
          onSearch={onSearch}
          onKeyDown={onKeyDown}
          onKeyUp={keypress}
          prefix={["/", "@"]}
          value={text}
          disabled={generating}
          readOnly={generating}
          options={getCommandOptions()}
          placeholder={intl
            .get("placeholder_side_panel_input")
            .d(
              "`/` specify instruction, `@` find agent, type `Enter` ask question.",
            )}
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
