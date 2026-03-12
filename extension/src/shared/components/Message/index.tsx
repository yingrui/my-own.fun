import { CopyOutlined } from "@ant-design/icons";
import type { MessageContent } from "@src/shared/agents/core/ChatMessage";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import Interaction from "@src/shared/agents/core/Interaction";
import type { SessionReasoningStep, SessionToolEvent } from "@src/shared/langgraph/runtime/types";
import MarkdownPreview from "@src/shared/components/Message/MarkdownPreview";
import { useScrollAnchor } from "@src/shared/hooks/use-scroll-anchor";
import type { CollapseProps } from "antd";
import { Collapse, message, Spin, Button } from "antd";
import copy from "copy-to-clipboard";
import React, { useEffect, useRef, useState } from "react";
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
  /** Status text shown while loading (e.g. "Thinking...", "Searching...") so user knows the AI is working. */
  statusMessage?: string;
  /** Model reasoning/thinking stream; shown in a distinct format (e.g. collapsible or muted). */
  reasoning?: string;
  /** Append-only reasoning snapshots from each major step/tool round. */
  reasoningSteps?: SessionReasoningStep[];
  /** Tool events captured from LangGraph tool-calling flow. */
  toolEvents?: SessionToolEvent[];
}

const getStepComponents = (
  interaction?: Interaction,
): CollapseProps["items"] => {
  if (!interaction) return [];
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
  const {
    index,
    role,
    content,
    loading,
    name,
    interaction,
    statusMessage: statusMessageProp,
    reasoning,
    reasoningSteps,
    toolEvents,
  } = props;
  const [steps, setSteps] = useState<CollapseProps["items"]>(
    getStepComponents(interaction),
  );
  const [statusMessage, setStatusMessage] = useState<string>(
    interaction ? interaction.getStatusMessage() : "",
  );
  const [showSteps, setShowSteps] = useState<boolean>(false);
  const [reasoningExpanded, setReasoningExpanded] = useState<boolean>(!!loading);
  const reasoningRef = useRef<HTMLDivElement>(null);
  const { scrollRef, scrollToBottom, messagesRef } = useScrollAnchor();

  useEffect(() => {
    if (loading && reasoning) {
      setReasoningExpanded(true);
    }
  }, [loading, reasoning]);

  useEffect(() => {
    if (!loading || !reasoningRef.current) return;
    reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
  }, [loading, reasoning, reasoningSteps]);

  function getContent(): string {
    if (content instanceof Array) {
      return content.find((c) => c.type === "text")?.text;
    }
    return content as string;
  }

  function getUserInputMessage(): string {
    if (role === "user" && interaction?.inputMessage) {
      return interaction.inputMessage.getContentText();
    }
    return getContent();
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
    if (typeof loading === "boolean") {
      return loading;
    }
    return !!interaction && interaction.getStatus() !== "Completed";
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

  const hasContent = !!getContent();
  const spinning = shouldSpin() && !hasContent;
  const currentReasoningText = reasoning && reasoning.trim()
    ? reasoning
    : loading
      ? "..."
      : "";

  return (
    <div ref={messagesRef} className={"message-item message-assistant"}>
      <div className="avatar">
        <img className="bot-avatar" src="/icons/logo.png" />
        <span>{name}</span>
      </div>
      <div className={"message-content bot-message-content"}>
        {spinning && (
          <div className={"message-spin"}>
            <Spin />
            {(statusMessageProp ?? (interaction && statusMessage)) && (
              <span className={"interaction-status"}>{statusMessageProp ?? statusMessage}</span>
            )}
          </div>
        )}
        {shouldSpin() && steps && steps.length > 0 && (
          <Collapse
            accordion
            items={steps}
            activeKey={steps.length - 1}
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
        {(reasoning || (reasoningSteps && reasoningSteps.length > 0)) && (
          <Collapse
            ghost
            activeKey={reasoningExpanded ? ["reasoning"] : []}
            onChange={(keys) => setReasoningExpanded(Array.isArray(keys) ? keys.length > 0 : !!keys)}
            items={[
              {
                key: "reasoning",
                label: (
                  <span className="reasoning-label">
                    {loading ? `${intl.get("message_reasoning_label").d("Thinking")}...` : intl.get("message_reasoning_label").d("Thinking")}
                  </span>
                ),
                children: (
                  <div className="message-reasoning" ref={reasoningRef}>
                    {!!reasoningSteps?.length && reasoningSteps.map((step) => (
                      <div key={step.id} className="reasoning-step">
                        <div className="reasoning-step-title">{step.title}</div>
                        <div>{step.content}</div>
                      </div>
                    ))}
                    {(loading || !!reasoning) && (
                      <div className="reasoning-step">
                        <div className="reasoning-step-title">
                          {intl.get("message_reasoning_current").d("Current step")}
                        </div>
                        <div>{currentReasoningText}</div>
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
        {!!toolEvents?.length && (
          <div className="tool-events">
            {toolEvents.map((event, idx) => (
              <div key={`${event.name}-${event.status}-${idx}`} className="tool-event-row">
                <span className={`tool-event-badge tool-event-${event.status}`}>
                  {event.status === "selected" ? "Selected" : "Executed"}
                </span>
                <span className="tool-event-name">{event.name}</span>
                {event.details && <span className="tool-event-details">{event.details}</span>}
              </div>
            ))}
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
