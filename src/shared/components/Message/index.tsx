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

interface MessageProps {
  index?: number;
  role: ChatMessage["role"];
  content: string | MessageContent[];
  name?: string;
  loading?: boolean;
  interaction?: Interaction;
}

const getChainOfThoughts = (
  interaction: Interaction,
): CollapseProps["items"] => {
  if (interaction && interaction.getGoal()) {
    return [
      {
        key: "1",
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
            {interaction.getGoal().replaceAll(/<[/]?think>/g, "")}
          </ReactMarkdown>
        ),
      },
    ];
  } else {
    return [];
  }
};

const Message: React.FC<MessageProps> = React.memo((props: MessageProps) => {
  const { index, role, content, loading, name, interaction } = props;
  const isAssistant = role === "assistant";
  const [chainOfThoughts, setChainOfThoughts] = useState<
    CollapseProps["items"]
  >(getChainOfThoughts(interaction));
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

  function handleCopy() {
    copy(getContent(), {});
    message.success("copy success");
  }

  if (interaction) {
    interaction.onChange(() => {
      setChainOfThoughts(getChainOfThoughts(interaction));
      setStatusMessage(interaction.getStatusMessage());
      setTimeout(() => {
        scrollToBottom();
      });
    });
  }

  function shouldSpin(): boolean {
    return (
      isAssistant && interaction && interaction.getStatus() !== "Completed"
    );
  }

  function hasChainOfThought(): boolean {
    const hasGoal = !!interaction && !!interaction.getGoal();
    return isAssistant && interaction && hasGoal;
  }

  return (
    <div
      ref={messagesRef}
      className={`message-item ${isAssistant ? "message-assistant" : ""}`}
    >
      {isAssistant && (
        <div className="avatar">
          <img className="bot-avatar" src="/icons/logo.png" />
          <span>{name}</span>
        </div>
      )}
      <div
        className={`message-content ${isAssistant ? "bot-message-content" : "user-message-content"}`}
      >
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
            items={chainOfThoughts}
            defaultActiveKey={1}
            ghost={true}
          />
        )}
        {hasChainOfThought() && !shouldSpin() && (
          <Collapse accordion items={chainOfThoughts} ghost={true} />
        )}
        <MarkdownPreview loading={loading} content={getContent()} />
        {isAssistant && !loading && index > 0 && (
          <div>
            <CopyOutlined className="copy-icon" onClick={handleCopy} />
          </div>
        )}
      </div>
      {!isAssistant && (
        <img className="user-avatar" src="/icons/user-icon.png" />
      )}
    </div>
  );
});

Message.displayName = "Message";

export default Message;
