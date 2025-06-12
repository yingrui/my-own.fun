import { CopyOutlined } from "@ant-design/icons";
import type { MessageContent } from "@src/shared/agents/core/ChatMessage";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import Interaction from "@src/shared/agents/core/Interaction";
import MarkdownPreview from "@src/shared/components/Message/MarkdownPreview";
import { useScrollAnchor } from "@src/shared/hooks/use-scroll-anchor";
import type { CollapseProps } from "antd";
import { Collapse, message, Spin } from "antd";
import copy from "copy-to-clipboard";
import React, { useState } from "react";
import intl from "react-intl-universal";
import "./index.css";
import StepComponent from "./StepComponent";
import UserMessage from "./UserMessage";

interface MessageProps {
  index?: number;
  role: ChatMessage["role"];
  content: string | MessageContent[];
  name?: string;
  loading?: boolean;
  interaction?: Interaction;
}

const getStepComponents = (
  interaction: Interaction,
): CollapseProps["items"] => {
  return interaction.getSteps().map((step, index) => {
    return {
      key: index,
      label: step.type,
      children: <StepComponent step={step} interaction={interaction} />,
    };
  });
};

const Message: React.FC<MessageProps> = React.memo((props: MessageProps) => {
  const { index, role, content, loading, name, interaction } = props;
  const [steps, setSteps] = useState<CollapseProps["items"]>(
    getStepComponents(interaction),
  );
  const [statusMessage, setStatusMessage] = useState<string>(
    interaction ? interaction.getStatusMessage() : "",
  );
  const { scrollRef, scrollToBottom, messagesRef } = useScrollAnchor();

  function getContent(): string {
    if (content instanceof Array) {
      return content.find((c) => c.type === "text")?.text;
    }
    return content as string;
  }

  function getUserInputMessage(): string {
    if (role === "user") {
      return interaction.inputMessage.getContentText();
    }
    return "";
  }

  function handleCopy() {
    copy(getContent(), {});
    message.success("copy success");
  }

  if (interaction) {
    interaction.onChange(() => {
      setSteps(getStepComponents(interaction));
      setStatusMessage(interaction.getStatusMessage());
      setTimeout(() => {
        scrollToBottom();
      });
    });
  }

  function shouldSpin(): boolean {
    return interaction && interaction.getStatus() !== "Completed";
  }

  if (role === "user") {
    return (
      <UserMessage
        role={role}
        content={getUserInputMessage()}
        interaction={interaction}
      />
    );
  }

  return (
    <div ref={messagesRef} className={"message-item message-assistant"}>
      <div className="avatar">
        <img className="bot-avatar" src="/icons/logo.png" />
        <span>{name}</span>
      </div>
      <div className={"message-content bot-message-content"}>
        {shouldSpin() && (
          // When content is empty
          <div className={"message-spin"}>
            <Spin />
            {interaction && (
              <span className={"interaction-status"}>{statusMessage}</span>
            )}
          </div>
        )}
        {shouldSpin() && (
          <Collapse
            accordion
            items={steps}
            activeKey={steps.length - 1}
            ghost={true}
          />
        )}
        {!shouldSpin() && <Collapse accordion items={steps} ghost={true} />}
        <MarkdownPreview loading={loading} content={getContent()} />
        {!loading && index > 0 && (
          <div>
            <CopyOutlined className="copy-icon" onClick={handleCopy} />
          </div>
        )}
      </div>
    </div>
  );
});

Message.displayName = "Message";

export default Message;
