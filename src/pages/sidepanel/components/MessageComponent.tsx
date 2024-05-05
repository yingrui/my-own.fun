import { Spin } from "antd";
import "./MessageComponent.css";
import Markdown from "react-markdown";

interface Props {
  role: ChatMessage["role"];
  content: string;
}

const Message = (props: Props) => {
  const { role, content } = props;
  const isAssistant = role === "assistant";
  return (
    <div className={`message-item ${isAssistant ? "message-assistant" : ""}`}>
      {isAssistant && <img className="bot-avatar" src="/icons/gm_logo.png" />}
      <div className="message-content">
        {content && <Markdown>{content}</Markdown>}
        {!content && (
          <>
            <Spin />
          </>
        )}
      </div>
      {!isAssistant && (
        <img className="user-avatar" src="/icons/user-icon.png" />
      )}
    </div>
  );
};

export default Message;
