import { CopyOutlined } from "@ant-design/icons";
import type { MessageContent } from "@src/shared/agents/core/ChatMessage";
import type { SessionStepItem } from "@src/shared/langgraph/runtime/types";
import { collapseArtifactCodeBlocks } from "@src/shared/artifacts";
import MarkdownPreview from "@src/shared/components/Message/MarkdownPreview";
import { Collapse, message, Spin } from "antd";
import copy from "copy-to-clipboard";
import React from "react";
import intl from "react-intl-universal";
import "./index.css";

interface MessageProps {
  index?: number;
  role: "assistant" | "user" | "system";
  content: string | MessageContent[];
  name?: string;
  loading?: boolean;
  statusMessage?: string;
  reasoning?: string;
  stepItems?: SessionStepItem[];
  /** When true, collapse artifact code blocks (html/svg/css/js) to a short placeholder. */
  collapseArtifacts?: boolean;
  /** Message id, used for artifact placeholder links. */
  messageId?: string;
  /** Called when user clicks an artifact placeholder link. */
  onArtifactClick?: (artifactId: string) => void;
}

function textContent(content: string | MessageContent[]): string {
  if (typeof content === "string") return content;
  return content.find((c) => c.type === "text")?.text ?? "";
}

const StepItemRow: React.FC<{ item: SessionStepItem }> = ({ item }) => {
  switch (item.type) {
    case "reasoning":
      return <div className="step-item step-item-reasoning">{item.content}</div>;
    case "tool_selected":
      return (
        <div className="step-item step-item-tool">
          <span className="tool-event-badge tool-event-selected">Selected</span>
          <span className="tool-event-name">{item.toolName}</span>
          {item.content && <span className="tool-event-details">{item.content}</span>}
        </div>
      );
    case "tool_executed":
      return (
        <div className="step-item step-item-tool">
          <span className="tool-event-badge tool-event-executed">Executed</span>
          <span className="tool-event-name">{item.toolName}</span>
          {item.content && <span className="tool-event-details">{item.content}</span>}
        </div>
      );
    case "content":
      return <div className="step-item step-item-content">{item.content}</div>;
    default:
      return null;
  }
};

type StepBlock =
  | { kind: "thoughts"; items: SessionStepItem[] }
  | { kind: "item"; item: SessionStepItem };

function groupStepItems(items: SessionStepItem[]): StepBlock[] {
  const blocks: StepBlock[] = [];
  let pending: SessionStepItem[] = [];

  const flush = () => {
    if (pending.length > 0) {
      blocks.push({ kind: "thoughts", items: pending });
      pending = [];
    }
  };

  for (const item of items) {
    if (item.type === "reasoning") {
      pending.push(item);
    } else {
      flush();
      blocks.push({ kind: "item", item });
    }
  }
  flush();
  return blocks;
}

const ThoughtsCollapse: React.FC<{ items: SessionStepItem[] }> = ({ items }) => (
  <Collapse
    ghost
    items={[
      {
        key: "thoughts",
        label: <span className="thoughts-label">{intl.get("message_reasoning_label").d("Thoughts")}</span>,
        children: (
          <div className="thoughts-content">
            {items.map((item) => (
              <div key={item.id} className="step-item step-item-reasoning">{item.content}</div>
            ))}
          </div>
        ),
      },
    ]}
  />
);

const Message: React.FC<MessageProps> = React.memo((props) => {
  const { index, role, content, loading, name, statusMessage, reasoning, stepItems, collapseArtifacts, messageId, onArtifactClick } = props;
  let text = textContent(content);
  if (role === "assistant" && collapseArtifacts && messageId && typeof text === "string") {
    text = collapseArtifactCodeBlocks(text, messageId);
  }

  if (role === "user") {
    return (
      <div className="message-item">
        <div className="message-content user-message-content">
          <MarkdownPreview loading={false} content={text} onArtifactClick={onArtifactClick} />
        </div>
        <img className="user-avatar" src="/icons/user-icon.png" />
      </div>
    );
  }

  const liveReasoning = reasoning?.trim() || "";

  return (
    <div className="message-item message-assistant">
      <div className="avatar">
        <img className="bot-avatar" src="/icons/logo.png" />
        <span>{name}</span>
      </div>
      <div className="message-content bot-message-content">
        {loading && (
          <div className="message-spin">
            <Spin />
            {statusMessage && <span className="interaction-status">{statusMessage}</span>}
          </div>
        )}
        {stepItems?.length > 0 && groupStepItems(stepItems).map((block, i) =>
          block.kind === "thoughts"
            ? <ThoughtsCollapse key={`thoughts-${i}`} items={block.items} />
            : <StepItemRow key={block.item.id} item={block.item} />,
        )}
        {loading && liveReasoning && (
          <div className="step-item step-item-reasoning step-item-live">{liveReasoning}</div>
        )}
        <MarkdownPreview loading={loading} content={text} onArtifactClick={onArtifactClick} />
        {!loading && index > 0 && (
          <div>
            <CopyOutlined
              className="copy-icon"
              onClick={() => { copy(text, {}); message.success("copy success"); }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

Message.displayName = "Message";

export default Message;
