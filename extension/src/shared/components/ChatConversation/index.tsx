import SensitiveTopicError from "@src/shared/agents/core/errors/SensitiveTopicError";
import Message from "@src/shared/components/Message";
import { useScrollAnchor } from "@src/shared/hooks/use-scroll-anchor";
import type { ChatSession, SessionMessage } from "@src/shared/langgraph/runtime/types";
import { delay } from "@src/shared/utils";
import { type MentionProps, Mentions, message as antdMessage } from "antd";
import type { MentionsRef } from "antd/lib/mentions";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import intl from "react-intl-universal";
import style from "./ChatConversation.module.scss";

interface ChatConversationProps {
  agent: ChatSession;
  question?: string;
  enableClearCommand?: boolean;
}

interface ChatConversationRef {
  generating: boolean;
  generateReply: (
    userInput: string,
    callback: () => Promise<string>,
  ) => Promise<string>;
}

type PrefixType = "@" | "/";

const ChatConversation = forwardRef<ChatConversationRef, ChatConversationProps>(
  ({ agent, question, enableClearCommand }, ref) => {
    const mentionRef = useRef<MentionsRef>();
    const [text, setText] = useState<string>();
    const [prefix, setPrefix] = useState<PrefixType>("@");
    const [generating, setGenerating] = useState<boolean>();
    const { scrollRef, scrollToBottom, messagesRef } = useScrollAnchor();
    const commandRef = useRef<boolean>();
    const inputMethodRef = useRef<boolean>(false);
    const [messages, setMessages] = useState<SessionMessage[]>(
      agent.getState().messages,
    );

    useEffect(() => {
      const unsubscribe = agent.onStateChange((state) => {
        setMessages(state.messages);
        setGenerating(state.generating);
      });
      if (question) {
        generateReply(question, () => agent.chat(question));
      }
      return () => unsubscribe();
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
        agent.clear();
        setText("");
        return;
      }
      await generateReply(text, () => agent.chat(text));
    }

    function handleError(e) {
      if (e instanceof SensitiveTopicError) {
        return intl.get("sensitive_topic").d("Sensitive topic detected.");
      } else {
        console.warn(e);
        return e.message;
      }
    }

    async function generateReply(
      userInput: string,
      generate_func: () => Promise<string>,
    ): Promise<string> {
      let result = "";
      try {
        setText("");

        try {
          result = await generate_func();
        } catch (e) {
          const errorMessage = handleError(e);
          antdMessage.error(errorMessage);
        }
      } finally {
        // no-op: generating is controlled by session state
      }

      setTimeout(() => {
        scrollToBottom();
      }, 100);
      return result;
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
        return agent.getAgentOptions?.() ?? [];
      }

      if (prefix === "/") {
        const options = agent.getCommandOptions?.() ?? [];
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
              {messages.map((message, i) => (
                <Message
                  key={message.id ?? i}
                  index={i}
                  role={message.role}
                  content={message.content}
                  name={message.name}
                  loading={message.loading}
                ></Message>
              ))}
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
