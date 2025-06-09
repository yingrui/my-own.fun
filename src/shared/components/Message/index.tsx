import { message, Spin, Collapse } from "antd";
import type { CollapseProps } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import "./index.css";
import MarkdownPreview from "@src/shared/components/Message/MarkdownPreview";
import copy from "copy-to-clipboard";
import Interaction from "@src/shared/agents/core/Interaction";
import React, { useState } from "react";
import type { MessageContent } from "@src/shared/agents/core/ChatMessage";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import intl from "react-intl-universal";
import { useScrollAnchor } from "@src/shared/hooks/use-scroll-anchor";
import CodeBlock, {
  rehypePlugins,
  remarkPlugins,
} from "@src/shared/components/Message/MarkDownBlock/CodeBlock";
import ReactMarkdown from "react-markdown";
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
  if (interaction && interaction.getGoal()) {
    return interaction
      .getSteps()
      .filter((step) => !!step.reasoning)
      .map((step, index) => {
        return {
          key: index,
          label: intl.get("side_panel_interaction_goal").d("Thought"),
          children: (
            <ReactMarkdown
              components={{
                code: (props) => {
                  return <CodeBlock {...props} loading={false} />;
                },
              }}
              rehypePlugins={rehypePlugins as any}
              remarkPlugins={remarkPlugins as any}
            >
              {step.reasoning.replaceAll(/<[/]?think>/g, "")}
            </ReactMarkdown>
          ),
        };
      });
  } else {
    return [];
  }
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

  function hasChainOfThought(): boolean {
    const hasGoal = !!interaction && !!interaction.getGoal();
    return interaction && hasGoal;
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
        {hasChainOfThought() && shouldSpin() && (
          <Collapse
            accordion
            items={steps}
            activeKey={steps.length - 1}
            ghost={true}
          />
        )}
        {hasChainOfThought() && !shouldSpin() && (
          <Collapse accordion items={steps} ghost={true} />
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
