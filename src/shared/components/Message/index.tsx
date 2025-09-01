import { CopyOutlined } from "@ant-design/icons";
import type { MessageContent } from "@src/shared/agents/core/ChatMessage";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import Interaction from "@src/shared/agents/core/Interaction";
import MarkdownPreview from "@src/shared/components/Message/MarkdownPreview";
import { useScrollAnchor } from "@src/shared/hooks/use-scroll-anchor";
import type { CollapseProps } from "antd";
import { Collapse, message, Spin, Button } from "antd";
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
    const label = step.type === "execute" ? step.action : step.type;
    return {
      key: index,
      label: label,
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
  const [showSteps, setShowSteps] = useState<boolean>(false);
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
      // Reset showSteps when interaction changes
      setShowSteps(false);
      setTimeout(() => {
        scrollToBottom();
      });
    });
  }

  function shouldSpin(): boolean {
    return interaction && interaction.getStatus() !== "Completed";
  }

  function handleShowSteps() {
    setShowSteps(!showSteps);
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
            activeKey={steps.length - 1} // the last step is expanded
            ghost={true}
          />
        )}
        {!shouldSpin() && steps && steps.length > 0 && (
          <div className="steps-container">
            <Button
              type="link"
              size="small"
              onClick={handleShowSteps}
              className="steps-toggle-button"
            >
              {showSteps
                ? intl.get("hide_steps").d("Hide Steps")
                : intl
                    .get("show_steps_count")
                    .d("Show Steps ({count})")
                    .replace("{count}", steps.length.toString())}
            </Button>
            {showSteps && <Collapse accordion items={steps} ghost={true} />}
          </div>
        )}
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
