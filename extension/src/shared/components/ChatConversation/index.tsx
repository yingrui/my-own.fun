import SensitiveTopicError from "@src/shared/agents/core/errors/SensitiveTopicError";
import Message from "@src/shared/components/Message";
import { useScrollAnchor } from "@src/shared/hooks/use-scroll-anchor";
import { useSpeechRecognition } from "@src/shared/hooks/useSpeechRecognition";
import type { Artifact } from "@src/shared/artifacts/types";
import type { ChatSession, SessionMessage } from "@src/shared/langgraph/runtime/types";
import { Input, message as antdMessage, Tooltip } from "antd";
import { AudioOutlined, StopOutlined } from "@ant-design/icons";
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
  onArtifactClick?: (artifactId: string) => void;
}

interface ChatConversationRef {
  generating: boolean;
  generateReply: (
    userInput: string,
    callback: () => Promise<string>,
  ) => Promise<string>;
}

const ChatConversation = forwardRef<ChatConversationRef, ChatConversationProps>(
  ({ agent, question, enableClearCommand, artifactsByMessageId = {}, onArtifactClick }, ref) => {
    const [text, setText] = useState<string>();
    const [generating, setGenerating] = useState<boolean>();
    const { scrollRef, scrollToBottom, messagesRef, handleScroll } = useScrollAnchor();
    const inputMethodRef = useRef<boolean>(false);
    const {
      isListening,
      transcript,
      interimTranscript,
      startListening,
      stopListening,
      supported: speechSupported,
    } = useSpeechRecognition({
      onError: (msg) => antdMessage.warning(msg),
    });
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

    // Sync speech transcript to input while listening
    useEffect(() => {
      if (isListening) {
        setText((transcript + interimTranscript).trim());
      }
    }, [isListening, transcript, interimTranscript]);

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

    async function handleRefresh(lastUserInput: string) {
      if (generating) return;
      agent.removeLastTurn?.();
      await generateReply(lastUserInput, () => agent.chat(lastUserInput));
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
                  messageId={message.id}
                  onArtifactClick={onArtifactClick}
                  onRefresh={
                    message.role === "assistant" && i > 0 && messages[i - 1]?.role === "user"
                      ? () => handleRefresh(messages[i - 1].content)
                      : undefined
                  }
                ></Message>
              ))}
              <div className="scroll-anchor" ref={messagesRef}></div>
            </div>
          </div>

          <div className={style.form}>
            <div className={style.inputWrapper}>
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
                style={{ paddingRight: 48 }}
              />
              {speechSupported && (
                <Tooltip
                  title={
                    isListening
                      ? intl.get("chat_voice_stop").d("Stop listening")
                      : intl.get("chat_voice_start").d("Talk to type")
                  }
                >
                  <span
                    className={`${style.voiceBtn} ${isListening ? style.voiceBtnActive : ""}`}
                    onClick={() => {
                      if (generating) return;
                      if (isListening) {
                        stopListening();
                      } else {
                        setText("");
                        startListening();
                      }
                    }}
                  >
                    {isListening ? (
                      <StopOutlined style={{ fontSize: 16 }} />
                    ) : (
                      <AudioOutlined style={{ fontSize: 16 }} />
                    )}
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </>
    );
  },
);

ChatConversation.displayName = "ChatConversation";

export default ChatConversation;
export { ChatConversationRef };
