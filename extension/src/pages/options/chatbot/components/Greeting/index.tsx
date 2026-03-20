import React, { useEffect, useRef, useState } from "react";
import { Input, Tooltip, message as antdMessage } from "antd";
import { AudioOutlined, StopOutlined } from "@ant-design/icons";
import { useSpeechRecognition } from "@src/shared/hooks/useSpeechRecognition";
import "./index.css";
import intl from "react-intl-universal";
import type { ChatSession } from "@src/shared/langgraph/runtime/types";

interface GreetingProps {
  onQuestionChange: (query: string) => void;
  agent: ChatSession;
  enableClearCommand?: boolean;
}

const Greeting: React.FC<GreetingProps> = ({
  onQuestionChange,
  agent,
  enableClearCommand,
}) => {
  const [text, setText] = useState<string>("");
  const inputMethodRef = useRef<boolean>(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isListening) {
      setText((transcript + interimTranscript).trim());
    }
  }, [isListening, transcript, interimTranscript]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      inputMethodRef.current = e.keyCode !== 13;
    }
  }

  function onKeyUp(e: React.KeyboardEvent) {
    if (e.key === "Enter" && e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();
      if (!inputMethodRef.current) {
        const queryString = text.trim();
        if (queryString) onQuestionChange(queryString);
      }
    }
  }

  return (
    <>
      <div className={"chatbot-icon-area"}>
        <div className={"chatbot-logo"}>
          <img src={"/icons/logo.svg"} />
          <h6>{intl.get("options_chatbot_ask_assistant").d("Ask myFun")}</h6>
        </div>
      </div>
      <div className={"chatbot-input-first-page"}>
        <div className={"chatbot-input-area chatbot-input-area-with-voice"}>
          <Input.TextArea
            ref={inputRef}
            className={"chatbot-input"}
            style={{ paddingRight: 48 }}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            value={text}
            placeholder={intl
              .get("placeholder_side_panel_input")
              .d("Type your message, press Enter to send.")}
            onChange={(e) => setText(e.target.value)}
            autoSize={{ minRows: 3, maxRows: 5 }}
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
                className={`chatbot-voice-btn ${isListening ? "chatbot-voice-btn-active" : ""}`}
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    setText("");
                    startListening();
                  }
                }}
              >
                {isListening ? (
                  <StopOutlined style={{ fontSize: 18 }} />
                ) : (
                  <AudioOutlined style={{ fontSize: 18 }} />
                )}
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
};

export default Greeting;
