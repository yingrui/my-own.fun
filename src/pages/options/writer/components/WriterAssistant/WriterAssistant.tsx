import React, { useState, useRef } from "react";
import { Button, Layout, Mentions } from "antd";
import { RedoOutlined, CloseOutlined } from "@ant-design/icons";
import type { MentionsRef } from "antd/lib/mentions";
import { useScrollAnchor } from "@src/shared/hooks/use-scroll-anchor";

import "./WriterAssistant.css";
import WriterContext from "@pages/options/writer/context/WriterContext";

import Message from "@src/shared/components/Message";

import { delay } from "@src/shared/utils";
import intl from "react-intl-universal";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import DelegateAgent from "@src/shared/agents/DelegateAgent";

const { Sider } = Layout;

interface WriterAssistantProps {
  context: WriterContext;
  initMessages: ChatMessage[];
  agent: DelegateAgent;
}

const WriterAssistant: React.FC<WriterAssistantProps> = ({
  context,
  initMessages,
  agent,
}) => {
  const [chatCollapsed, setChatCollapsed] = useState(true);

  const mentionRef = useRef<MentionsRef>();
  const commandRef = useRef<boolean>();
  const [text, setText] = useState<string>();
  const [generating, setGenerating] = useState<boolean>();
  const [currentText, setCurrentText] = useState<string>();
  const [messages, setList] = useState<ChatMessage[]>(initMessages);
  const { scrollRef, scrollToBottom, messagesRef } = useScrollAnchor();

  const handleOnSelect = async () => {
    commandRef.current = true;
    await delay(200);
    commandRef.current = false;
  };

  async function keypress(e: any) {
    if (e.key == "Enter" && e.keyCode == 13 && !e.shiftKey) {
      e.preventDefault();
      if (!commandRef.current) {
        handleSubmit();
      }
    }
  }

  async function handleSubmit() {
    if (generating) {
      return;
    }
    if (!text || text.trim() === "") {
      setText("");
      return;
    }

    setGenerating(true);
    const userInput = text;
    setText("");
    if (userInput) {
      appendMessage("user", userInput);
    }
    agent.onMessageChange((msg) => {
      setCurrentText(msg);
      setTimeout(() => {
        scrollToBottom();
      });
    });
    const result = await agent.chat(messages[messages.length - 1]);
    const message = await result.getMessage();

    appendMessage("assistant", message);
    setCurrentText("");
    setGenerating(false);

    setTimeout(() => {
      scrollToBottom();
    });
  }

  function appendMessage(role: ChatMessage["role"], content: string) {
    let name = "";
    if (role === "user") {
      name = "You";
    } else if (role === "assistant") {
      name = "myFun";
    }

    const message = new ChatMessage({
      role: role,
      content: content,
      name: name,
    });
    messages.push(message);
    setList([...messages]);
  }

  function clearMessages() {
    const cloneInitMessages = [...initMessages];
    agent.getConversation().reset(cloneInitMessages);
    setList(cloneInitMessages);
    setText("");
  }

  return (
    <Sider
      id="writer-right-sider"
      width={400}
      collapsedWidth={36}
      trigger={null}
      collapsible
      collapsed={chatCollapsed}
    >
      <div className="chat">
        <div className="chat-sider-header">
          {chatCollapsed ? null : (
            <>
              <img src="/icons/logo.png" />
              <h6>
                {intl.get("options_app_writer_assistant_header").d("Chat")}
              </h6>
            </>
          )}
          <Button
            type="text"
            icon={
              chatCollapsed ? <img src="/icons/logo.png" /> : <CloseOutlined />
            }
            onClick={() => setChatCollapsed(!chatCollapsed)}
            style={{
              fontSize: "16px",
              width: 36,
              height: 64,
              float: "right",
            }}
          />
          <Button
            type="text"
            icon={<RedoOutlined />}
            onClick={() => clearMessages()}
            style={{
              fontSize: "16px",
              width: 36,
              height: 64,
              float: "right",
              display: chatCollapsed ? "none" : "flex",
            }}
          />
        </div>
        <div
          className="chat-sider-body"
          style={{
            display: chatCollapsed ? "none" : "flex",
          }}
        >
          <div className="chat-list">
            <div>
              {messages
                .filter((msg) => msg.role != "system")
                .map((msg, i) => (
                  <Message
                    key={i}
                    index={i}
                    role={msg.role}
                    name={msg.name}
                    content={msg.content}
                  ></Message>
                ))}
              {generating && (
                <Message
                  role="assistant"
                  name="..."
                  content={currentText}
                  loading
                ></Message>
              )}
              <div className="helper" ref={messagesRef}></div>
            </div>
          </div>
          <div className="chat-form">
            <Mentions
              ref={mentionRef}
              onSelect={handleOnSelect}
              onKeyUp={keypress}
              prefix={"/"}
              value={text}
              disabled={generating}
              readOnly={generating}
              options={agent.getCommandOptions()}
              placeholder={intl
                .get("options_app_writer_assistant_input_placeholder")
                .d("Hit Enter to send the message...")}
              onChange={(value) => {
                setText(value);
              }}
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </div>
        </div>
      </div>
    </Sider>
  );
};

export default WriterAssistant;
