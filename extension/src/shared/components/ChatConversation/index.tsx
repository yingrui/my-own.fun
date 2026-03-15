import SensitiveTopicError from "@src/shared/agents/core/errors/SensitiveTopicError";
import Message from "@src/shared/components/Message";
import { useScrollAnchor } from "@src/shared/hooks/use-scroll-anchor";
import type { Artifact } from "@src/shared/artifacts/types";
import type { ChatSession, SessionMessage } from "@src/shared/langgraph/runtime/types";
import { Input, message as antdMessage } from "antd";
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
  artifactsByMessageId?: Record<string, Artifact[]>;
}

interface ChatConversationRef {
  generating: boolean;
  generateReply: (
    userInput: string,
    callback: () => Promise<string>,
  ) => Promise<string>;
}

const ChatConversation = forwardRef<ChatConversationRef, ChatConversationProps>(
  ({ agent, question, enableClearCommand, artifactsByMessageId = {} }, ref) => {
    const [text, setText] = useState<string>();
    const [generating, setGenerating] = useState<boolean>();
    const { scrollRef, scrollToBottom, messagesRef, handleScroll } = useScrollAnchor();
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

    useEffect(() => {
      if (generating) {
        scrollToBottom("auto");
      }
    }, [messages, generating, scrollToBottom]);

    async function handleSubmit() {
      if (generating) {
        return;
      }
      if (!text || text.trim() === "") {
        setText("");
        return;
      }
      if (enableClearCommand) {
        const t = text.trim().toLowerCase();
        if (t === "/clear" || t === "/c" || t === "/cl") {
          agent.clear();
          setText("");
          return;
        }
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
        scrollToBottom("smooth", true);

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

    function onKeyDown(e: React.KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // if keyCode is not 13, then it's input method enter
        inputMethodRef.current = e.keyCode !== 13;
      }
    }

    function onKeyUp(e: React.KeyboardEvent) {
      if (e.key === "Enter" && e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        if (!inputMethodRef.current) handleSubmit();
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
          <div className={style.chatList} ref={scrollRef} onScroll={handleScroll}>
            <div>
              {messages.map((message, i) => (
                <Message
                  key={message.id ?? i}
                  index={i}
                  role={message.role}
                  content={message.content}
                  name={message.name}
                  loading={message.loading}
                  statusMessage={message.statusMessage}
                  reasoning={message.reasoning}
                  stepItems={message.stepItems}
                  collapseArtifacts={(artifactsByMessageId[message.id ?? ""]?.length ?? 0) > 0}
                ></Message>
              ))}
              <div className="scroll-anchor" ref={messagesRef}></div>
            </div>
          </div>

          <div className={style.form}>
            <Input.TextArea
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              value={text}
              disabled={generating}
              readOnly={generating}
              placeholder={intl
                .get("placeholder_side_panel_input")
                .d("Type your message, press Enter to send.")}
              onChange={(e) => setText(e.target.value)}
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
