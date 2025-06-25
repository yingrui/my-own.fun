import { describe, it, expect } from "vitest";
import Conversation from "../core/Conversation";
import { DefaultContextTransformer } from "./ContextTransformer";
import ChatMessage from "../core/ChatMessage";
import { Step } from "../core/Interaction";

describe("ContextTransformer", () => {
  const stub = (systemPrompt: string, messages: ChatMessage[]) => {
    const conversation = new Conversation(systemPrompt);
    conversation.reset(messages);
    return conversation;
  };

  it("should transform the conversation to messages", () => {
    const transformer = new DefaultContextTransformer();
    const conversation = stub("You are a helpful assistant.", [
      new ChatMessage({ role: "user", content: "Hello" }),
      new ChatMessage({
        role: "assistant",
        content: "Hello, how can I help you?",
      }),
    ]);
    const messages = transformer.toMessages(conversation);
    expect(messages.length).toEqual(3);
    expect(messages[0].role).toEqual("system");
    expect(messages[0].content).toEqual("You are a helpful assistant.");
    expect(messages[1].role).toEqual("user");
    expect(messages[1].content).toEqual("Hello");
    expect(messages[2].role).toEqual("assistant");
    expect(messages[2].content).toEqual("Hello, how can I help you?");
  });

  it("should transform the started step to message", () => {
    const transformer = new DefaultContextTransformer();
    const conversation = stub("You are a helpful assistant.", [
      new ChatMessage({ role: "user", content: "Hello" }),
      new ChatMessage({
        role: "assistant",
        content: "Hello, how can I help you?",
      }),
      new ChatMessage({
        role: "user",
        content: "What is the capital of France?",
      }),
    ]);
    const step = new Step();
    step.type = "plan";
    expect(step.status).toEqual("started");
    // step.systemMessage and step.result should be empty
    conversation.getCurrentInteraction().addStep(step);

    const messages = transformer.toMessages(conversation);
    expect(messages.length).toEqual(4);
    expect(messages[0].role).toEqual("system");
    expect(messages[0].content).toEqual("You are a helpful assistant.");
    expect(messages[1].role).toEqual("user");
    expect(messages[1].content).toEqual("Hello");
    expect(messages[2].role).toEqual("assistant");
    expect(messages[2].content).toEqual("Hello, how can I help you?");
    expect(messages[3].role).toEqual("user");
    expect(messages[3].content).toEqual("What is the capital of France?");
  });

  it("should transform the steps to messages", () => {
    const transformer = new DefaultContextTransformer();
    const conversation = stub("You are a helpful assistant.", [
      new ChatMessage({ role: "user", content: "Hello" }),
      new ChatMessage({
        role: "assistant",
        content: "Hello, how can I help you?",
      }),
      new ChatMessage({
        role: "user",
        content: "What is the capital of France?",
      }),
    ]);
    const step = new Step();
    step.type = "plan";
    step.status = "completed";
    step.systemMessage =
      "Analyze the user's intent and output the goal from previous messages.";
    step.result = "Goal: Find the capital of France.";
    conversation.getCurrentInteraction().addStep(step);

    const messages = transformer.toMessages(conversation);
    expect(messages.length).toEqual(6);
    expect(messages[0].role).toEqual("system");
    expect(messages[0].content).toEqual("You are a helpful assistant.");
    expect(messages[1].role).toEqual("user");
    expect(messages[1].content).toEqual("Hello");
    expect(messages[2].role).toEqual("assistant");
    expect(messages[2].content).toEqual("Hello, how can I help you?");
    expect(messages[3].role).toEqual("user");
    expect(messages[3].content).toEqual("What is the capital of France?");
    expect(messages[4].role).toEqual("system");
    expect(messages[4].content).toEqual(
      "Analyze the user's intent and output the goal from previous messages.",
    );
    expect(messages[5].role).toEqual("assistant");
    expect(messages[5].content).toEqual("Goal: Find the capital of France.");
  });
});
