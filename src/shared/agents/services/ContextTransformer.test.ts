import { describe, it, expect, beforeEach } from "vitest";
import Conversation from "../core/Conversation";
import { DefaultContextTransformer } from "./ContextTransformer";
import ChatMessage from "../core/ChatMessage";
import { Step } from "../core/Interaction";

describe("ContextTransformer", () => {
  let transformer: DefaultContextTransformer;
  let conversation: Conversation;

  beforeEach(() => {
    transformer = new DefaultContextTransformer();
    conversation = new Conversation("You are a helpful assistant.");
  });

  const createMessages = () => [
    new ChatMessage({ role: "user", content: "Hello" }),
    new ChatMessage({
      role: "assistant",
      content: "Hello, how can I help you?",
    }),
    new ChatMessage({
      role: "user",
      content: "What is the capital of France?",
    }),
  ];

  const createStep = (
    type: "plan" | "execute",
    systemMessage: string,
    result: string,
    action?: string,
    arguments_?: any,
    actionResult?: string,
    status: "started" | "completed" = "completed",
  ) => {
    const step = new Step();
    step.type = type;
    step.status = status;
    step.systemMessage = systemMessage;
    step.result = result;
    if (action) step.action = action;
    if (arguments_) step.arguments = arguments_;
    if (actionResult) step.actionResult = actionResult;
    return step;
  };

  it("should transform basic conversation to messages", () => {
    conversation.reset(createMessages());
    expect(conversation.getInteractions()).toHaveLength(2);
    expect(
      conversation.getCurrentInteraction().outputMessage.isEmpty(),
    ).toBeTruthy();

    const messages = transformer.toMessages(conversation);

    expect(messages).toHaveLength(4);
    expect(messages[0]).toEqual(
      expect.objectContaining({
        role: "system",
        content: "You are a helpful assistant.",
      }),
    );
    expect(messages[1]).toEqual(
      expect.objectContaining({ role: "user", content: "Hello" }),
    );
    expect(messages[2]).toEqual(
      expect.objectContaining({
        role: "assistant",
        content: "Hello, how can I help you?",
      }),
    );
    expect(messages[3]).toEqual(
      expect.objectContaining({
        role: "user",
        content: "What is the capital of France?",
      }),
    );
  });

  it("should transform started step without adding messages", () => {
    conversation.reset(createMessages());
    const step = new Step();
    step.type = "plan";
    conversation.getCurrentInteraction().addStep(step);

    const messages = transformer.toMessages(conversation);
    expect(messages).toHaveLength(4);
  });

  it("should transform completed planning step to messages", () => {
    conversation.reset(createMessages());
    const planStep = createStep(
      "plan",
      "Analyze the user's intent and output the goal from previous messages.",
      "Goal: Find the capital of France.",
    );
    conversation.getCurrentInteraction().addStep(planStep);

    const messages = transformer.toMessages(conversation);
    expect(messages).toHaveLength(6);
    expect(messages[4]).toEqual(
      expect.objectContaining({
        role: "system",
        content:
          "Analyze the user's intent and output the goal from previous messages.",
      }),
    );
    expect(messages[5]).toEqual(
      expect.objectContaining({
        role: "assistant",
        content: "Goal: Find the capital of France.",
      }),
    );
  });

  it("should transform started execution step to messages", () => {
    conversation.reset(createMessages());
    const planStep = createStep(
      "plan",
      "Analyze the user's intent and output the goal from previous messages.",
      "Goal: Find the capital of France.",
    );
    const expectedAction = "search";
    const expectedActionResult = '{"result": "..."}';
    const executionStep = createStep(
      "execute",
      "Choose tool or answer question",
      "", // result is empty for started step
      expectedAction,
      { userInput: "What is the capital of France?" },
      expectedActionResult, // executed but not completed
      "started",
    );

    conversation.getCurrentInteraction().addStep(planStep);
    conversation.getCurrentInteraction().addStep(executionStep);

    const messages = transformer.toMessages(conversation);
    // should not have replied message from assistant
    expect(messages).toHaveLength(8);
    // should have system message
    expect(messages[6]).toEqual(
      expect.objectContaining({
        role: "system",
        content: "Choose tool or answer question",
      }),
    );
    // The last message should have executed action name if it is not empty
    expect(messages[7]).toEqual(
      expect.objectContaining({
        role: "system",
        content: expect.stringContaining(expectedAction),
      }),
    );
    // The last message should have executed action result if it is not empty
    expect(messages[7]).toEqual(
      expect.objectContaining({
        role: "system",
        content: expect.stringContaining(expectedActionResult),
      }),
    );
  });

  it("should transform completed execution step to messages", () => {
    conversation.reset(createMessages());
    const planStep = createStep(
      "plan",
      "Analyze the user's intent and output the goal from previous messages.",
      "Goal: Find the capital of France.",
    );
    const executionStep = createStep(
      "execute",
      "Choose tool or answer question",
      "The capital of France is Paris.",
      "search",
      { userInput: "What is the capital of France?" },
      '{"result": "..."}',
      "completed",
    );

    conversation.getCurrentInteraction().addStep(planStep);
    conversation.getCurrentInteraction().addStep(executionStep);

    const messages = transformer.toMessages(conversation);
    expect(messages).toHaveLength(9);
    expect(messages[6]).toEqual(
      expect.objectContaining({
        role: "system",
        content: "Choose tool or answer question",
      }),
    );
    expect(messages[7]).toEqual(
      expect.objectContaining({
        role: "system",
        content: expect.stringContaining("Execute action: search:"),
      }),
    );
    expect(messages[8]).toEqual(
      expect.objectContaining({
        role: "assistant",
        content: "The capital of France is Paris.",
      }),
    );
  });
});
