import { CopyOutlined, ReloadOutlined } from "@ant-design/icons";
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
  /** Called when user clicks refresh to reprocess last user input. Only for assistant messages. */
  onRefresh?: () => void;
}

function textContent(content: string | MessageContent[]): string {
  if (typeof content === "string") return content;
  return content.find((c) => c.type === "text")?.text ?? "";
}

function formatToolTitle(toolName: string, params?: string): string {
  if (!params || params.trim() === "{}") return toolName;
  const short = params.length > 60 ? `${params.slice(0, 60)}…` : params;
  return `${toolName}(${short})`;
}

const ToolCallPanel: React.FC<{
  toolName: string;
  params?: string;
  result: string;
}> = ({ toolName, params, result }) => {
  const title = formatToolTitle(toolName, params);
  return (
    <div className="tool-call-panel">
      <div className="tool-call-panel-title">{title}</div>
      <div className="tool-call-panel-content">{result || "—"}</div>
    </div>
  );
};

const StepItemRow: React.FC<{ item: SessionStepItem }> = ({ item }) => {
  switch (item.type) {
    case "reasoning":
      return <div className="step-item step-item-reasoning">{item.content}</div>;
    case "content":
      return <div className="step-item step-item-content">{item.content}</div>;
    default:
      return null;
  }
};

type StepBlock =
  | { kind: "thoughts"; items: SessionStepItem[] }
  | { kind: "tool_call"; selected?: SessionStepItem; executed?: SessionStepItem }
  | { kind: "item"; item: SessionStepItem };

function groupStepItems(items: SessionStepItem[]): StepBlock[] {
  const blocks: StepBlock[] = [];
  let pending: SessionStepItem[] = [];
  const selectedQueue: SessionStepItem[] = [];

  const flushThoughts = () => {
    if (pending.length > 0) {
      blocks.push({ kind: "thoughts", items: pending });
      pending = [];
    }
  };

  const replaceFirstPendingToolCall = (selected: SessionStepItem | undefined, executed: SessionStepItem) => {
    const idx = blocks.findIndex(
      (b) => b.kind === "tool_call" && !b.executed,
    );
    if (idx >= 0) {
      blocks[idx] = { kind: "tool_call", selected, executed };
    } else {
      blocks.push({ kind: "tool_call", selected, executed });
    }
  };

  for (const item of items) {
    if (item.type === "reasoning") {
      pending.push(item);
    } else if (item.type === "tool_selected") {
      flushThoughts();
      selectedQueue.push(item);
      blocks.push({ kind: "tool_call", selected: item, executed: undefined });
    } else if (item.type === "tool_executed") {
      flushThoughts();
      const selected = selectedQueue.shift();
      replaceFirstPendingToolCall(selected, item);
    } else {
      flushThoughts();
      blocks.push({ kind: "item", item });
    }
  }
  flushThoughts();
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
  const { index, role, content, loading, name, statusMessage, reasoning, stepItems, collapseArtifacts, messageId, onArtifactClick, onRefresh } = props;
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
        {stepItems?.length > 0 && groupStepItems(stepItems).map((block, i) => {
          if (block.kind === "thoughts") {
            return <ThoughtsCollapse key={`thoughts-${i}`} items={block.items} />;
          }
          if (block.kind === "tool_call") {
            const toolName = block.executed?.toolName ?? block.selected?.toolName ?? "";
            const result = block.executed?.content ?? "";
            return (
              <ToolCallPanel
                key={block.executed?.id ?? block.selected?.id ?? `tool-${i}`}
                toolName={toolName}
                params={block.selected?.content}
                result={result}
              />
            );
          }
          return <StepItemRow key={block.item.id} item={block.item} />;
        })}
        {loading && liveReasoning && (
          <div className="step-item step-item-reasoning step-item-live">{liveReasoning}</div>
        )}
        <MarkdownPreview loading={loading} content={text} onArtifactClick={onArtifactClick} />
        {!loading && index > 0 && (
          <div className="message-actions">
            <CopyOutlined
              className="copy-icon"
              onClick={() => { copy(text, {}); message.success("copy success"); }}
              title={intl.get("copy").d("Copy")}
            />
            {onRefresh && (
              <ReloadOutlined
                className="refresh-icon"
                onClick={onRefresh}
                title={intl.get("message_regenerate").d("Regenerate")}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
});

Message.displayName = "Message";

export default Message;
