interface MessageContent {
  type: "text" | "image_url" | "video_url";
  text?: string;
  image_url?: {
    url: string;
  };
  video_url?: {
    url: string;
  };
}

interface MessageProps {
  role: "assistant" | "user" | "system";
  content: string | MessageContent[];
  name?: string;
}

class ChatMessage {
  role: "assistant" | "user" | "system";
  content: string | MessageContent[];
  name?: string;

  constructor(props: MessageProps) {
    const { role, content, name } = props;
    this.role = role;
    this.content = content;
    this.name = name;
  }

  public getContentText(): string {
    if (!this.content) return "";

    if (this.content instanceof Array) {
      return this.content.find((c) => c.type === "text")?.text;
    }
    return this.content as string;
  }
}

export function textContent(content: string): MessageContent[] {
  return [{ type: "text", text: content }];
}

export function imageContent(
  content: string,
  screenshot: string,
): MessageContent[] {
  return [
    { type: "text", text: content },
    { type: "image_url", image_url: { url: screenshot } },
  ];
}

export default ChatMessage;
export type { MessageProps, MessageContent };
