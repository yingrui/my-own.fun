import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { type MentionProps, Mentions } from "antd";
import intl from "react-intl-universal";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import style from "./ChatConversation.module.scss";
import Message from "@src/shared/components/Message";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import type { MentionsRef } from "antd/lib/mentions";
import { useScrollAnchor } from "@src/shared/hooks/use-scroll-anchor";
import { delay } from "@src/shared/utils";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import SensitiveTopicError from "@src/shared/agents/core/errors/SensitiveTopicError";
import Thought from "@src/shared/agents/core/Thought";
import AgentFactory from "@pages/options/chatbot/agents/AgentFactory";

interface ChatConversationProps {
  config: GluonConfigure;
  agent: DelegateAgent;
  question?: string;
  enableClearCommand?: boolean;
}

interface ChatConversationRef {
  generating: boolean;
  generateReply: (
    userInput: string,
    callback: () => Promise<any>,
  ) => Promise<any>;
}

type PrefixType = "@" | "/";

const ChatConversation = forwardRef<ChatConversationRef, ChatConversationProps>(
  ({ config, agent, question, enableClearCommand }, ref) => {
    const mentionRef = useRef<MentionsRef>();
    const [text, setText] = useState<string>();
    const [prefix, setPrefix] = useState<PrefixType>("@");
    const [currentText, setCurrentText] = useState<string>();
    const [generating, setGenerating] = useState<boolean>();
    const { scrollRef, scrollToBottom, messagesRef } = useScrollAnchor();
    const commandRef = useRef<boolean>();
    const inputMethodRef = useRef<boolean>(false);
    const [messages, setList] = useState<ChatMessage[]>([
      ...agent.getConversation().getMessages(),
    ]);

    useEffect(() => {
      if (question) {
        generateReply(question, () =>
          agent.chat(messages[messages.length - 1]),
        ).then((msg) => {
          // do something with the message
        });
      }
    }, []);

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
        const cloneInitMessages = [...AgentFactory.getInitialMessages(config)];
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
        // if keyCode is not 13, then it's input method enter
        inputMethodRef.current = e.keyCode !== 13;
      }
    }

    async function onKeyUp(e: any) {
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
        if (enableClearCommand) {
          options.push({ value: "clear", label: "/clear" }); // add clear command
        }
        return options;
      }
    }

    // Expose imperative methods to parent component.
    // Parent component uses ref to access below imperative methods
    useImperativeHandle(ref, () => ({
      generating,
      generateReply,
    }));

    return (
      <>
        <div className={style.chat}>
          <div className={style.chatList}>
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
              <div className="scroll-anchor" ref={messagesRef}></div>
            </div>
          </div>

          <div className={style.form}>
            <Mentions
              ref={mentionRef}
              onSelect={handleSearchChange}
              onSearch={onSearch}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
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
      </>
    );
  },
);

ChatConversation.displayName = "ChatConversation";

export default ChatConversation;
export { ChatConversationRef };
