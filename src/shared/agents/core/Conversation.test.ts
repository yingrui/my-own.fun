import { describe, it, expect } from "vitest";
import Conversation, { ConversationJsonSerializer } from "./Conversation";
import ChatMessage from "./ChatMessage";

describe("Conversation", () => {
  const stub = (messages: ChatMessage[]) => {
    const conversation = new Conversation();
    conversation.reset(messages);
    return conversation;
  };

  const stubConversation = stub([
    new ChatMessage({ role: "user", content: "u1" }),
    new ChatMessage({ role: "assistant", content: "a1" }),
    new ChatMessage({ role: "user", content: "u2" }),
    new ChatMessage({ role: "assistant", content: "a2" }),
  ]);

  it("should return key and uuid", () => {
    expect(stubConversation.getKey().startsWith("conversation_")).toBeTruthy();
    expect(
      stubConversation.getKey().includes(stubConversation.getUuid()),
    ).toBeTruthy();
  });

  it("should be able to return the messages and interactions", () => {
    expect(stubConversation.getMessages().length).toBe(4);
    expect(stubConversation.getInteractions().length).toBe(2);
  });

  describe("Context Control", () => {
    it("should be able to return the messages with the context length", () => {
      expect(stubConversation.getMessages(0)).toEqual([]);
    });
  });

  describe("Conversation Serialization", () => {
    it("should be able to convert a conversation to Json", () => {
      const conversation = stub([
        new ChatMessage({
          role: "user",
          content: "Hello, world!",
        }),
      ]);
      const json = new ConversationJsonSerializer().toString(conversation);
      expect(json).toBe('[{"goal":"","user":"Hello, world!","assistant":""}]');
    });

    it("should be able to filter interactions with output message", () => {
      const conversation = stub([
        new ChatMessage({
          role: "user",
          content: "Hello, world!",
        }),
      ]);
      const serializer = new ConversationJsonSerializer(
        -1,
        (interaction) => interaction.outputMessage.getContentText() !== "",
      );
      const json = serializer.toString(conversation);
      expect(json).toBe("[]");
    });
  });
});
