import { describe, it, expect } from "vitest";
import Conversation from "./Conversation";
import ChatMessage from "./ChatMessage";

describe("Conversation", () => {
  const stubConversation = (chatMessage: ChatMessage) => {
    const conversation = new Conversation();
    conversation.appendMessage(chatMessage);
    return conversation;
  };

  it("should be able to convert a conversation to Json", () => {
    const conversation = stubConversation(
      new ChatMessage({
        role: "user",
        content: "Hello, world!",
      }),
    );
    const json = conversation.toJSONString();
    expect(json).toBe('[{"goal":"","user":"Hello, world!","assistant":""}]');
  });

  it("should be able to filter chat messages when converting a conversation to Json", () => {
    const conversation = stubConversation(
      new ChatMessage({
        role: "user",
        content: "Hello, world!",
      }),
    );
    const json = conversation.toJSONString(
      (interaction) => !!interaction.outputMessage,
    );
    expect(json).toBe("[]");
  });
});
