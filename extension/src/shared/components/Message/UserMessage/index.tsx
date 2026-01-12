import ChatMessage from "@src/shared/agents/core/ChatMessage";
import Interaction from "@src/shared/agents/core/Interaction";
import MarkdownPreview from "@src/shared/components/Message/MarkdownPreview";
import React from "react";
import "./index.css";

interface UserMessageProps {
  role: ChatMessage["role"];
  content: string;
  interaction?: Interaction;
}

const UserMessage: React.FC<UserMessageProps> = React.memo(
  (props: UserMessageProps) => {
    const { role, content, interaction } = props;
    const isUser = role === "user";
    if (!isUser) {
      throw new Error("UserMessage can only be used for user messages");
    }

    function getContent(): string {
      return content;
    }

    return (
      <div className={"message-item"}>
        <div className={`message-content user-message-content`}>
          <MarkdownPreview loading={false} content={getContent()} />
        </div>
        <img className="user-avatar" src="/icons/user-icon.png" />
      </div>
    );
  },
);

UserMessage.displayName = "UserMessage";

export default UserMessage;
