import { describe, it, expect, beforeEach } from "vitest";
import Conversation, { ConversationJsonSerializer } from "./Conversation";
import ChatMessage from "./ChatMessage";

describe("Conversation", () => {
  let conversation: Conversation;

  const createTestMessages = () => [
    new ChatMessage({ role: "user", content: "u1" }),
    new ChatMessage({ role: "assistant", content: "a1" }),
    new ChatMessage({ role: "user", content: "u2" }),
    new ChatMessage({ role: "assistant", content: "a2" }),
  ];

  beforeEach(() => {
    conversation = new Conversation();
    conversation.reset(createTestMessages());
  });

  it("should return key and uuid", () => {
    expect(conversation.getKey()).toMatch(/^conversation_.*/);
    expect(conversation.getKey()).toContain(conversation.getUuid());
  });

  it("should return messages and interactions", () => {
    expect(conversation.getMessages()).toHaveLength(4);
    expect(conversation.getInteractions()).toHaveLength(2);
  });

  describe("Context Control", () => {
    it("should return empty messages with zero context length", () => {
      expect(conversation.getMessages(0)).toEqual([]);
    });
  });

  describe("Conversation Serialization", () => {
    it("should convert conversation to JSON", () => {
      const simpleConversation = new Conversation();
      simpleConversation.reset([
        new ChatMessage({ role: "user", content: "Hello, world!" }),
      ]);

      const json = new ConversationJsonSerializer().toString(
        simpleConversation,
      );
      expect(json).toBe('[{"goal":"","user":"Hello, world!","assistant":""}]');
    });

    it("should filter interactions with output message", () => {
      const simpleConversation = new Conversation();
      simpleConversation.reset([
        new ChatMessage({ role: "user", content: "Hello, world!" }),
      ]);

      const serializer = new ConversationJsonSerializer(
        -1,
        (interaction) => interaction.outputMessage.getContentText() !== "",
      );
      const json = serializer.toString(simpleConversation);
      expect(json).toBe("[]");
    });
  });
});
