import Interaction from "./Interaction";
import { v4 as uuidv4 } from "uuid";
import ChatMessage from "./ChatMessage";
import Environment from "./Environment";
import Thought from "./Thought";

class Conversation {
  private readonly uuid: string;
  private readonly datetime: string;
  private interactions: Interaction[] = [];
  private onInteractionStartedCallback: () => void = () => {};
  private systemPrompt: string = null; // This system prompt is used in chat completion API

  constructor(defaultSystemPrompt: string = null) {
    this.uuid = uuidv4();
    this.datetime = new Date().toISOString();
    this.systemPrompt = defaultSystemPrompt;
  }

  public appendMessage(message: ChatMessage): Conversation {
    if (message.role === "user") {
      return this.appendUserMessage(message);
    } else if (message.role === "assistant") {
      return this.appendAssistantMessage(message);
    }
    return this;
  }

  private appendUserMessage(message: ChatMessage): Conversation {
    this.interactions.push(new Interaction(message));
    return this;
  }

  private appendAssistantMessage(message: ChatMessage): Conversation {
    if (this.interactions.length > 0) {
      this.getCurrentInteraction().setOutputMessage(message);
    }
    return this;
  }

  public onInteractionStarted(callback: () => void): void {
    this.onInteractionStartedCallback = callback;
  }

  public async startInteraction(
    message: ChatMessage,
    environment: Environment,
    agentName: string,
  ): Promise<void> {
    this.appendMessage(message);
    const interaction = this.getCurrentInteraction();
    // Perception
    interaction.environment = environment;
    interaction.setAgentName(agentName);
    this.onInteractionStartedCallback();
  }

  public async completeInteraction(
    result: Thought,
    agentName: string,
  ): Promise<string> {
    this.getCurrentInteraction().setStatus("Completed", "");
    this.getCurrentInteraction().setAgentName(agentName);

    if (result.type === "error") {
      return result.error.message;
    }

    const message = await result.getMessage();
    this.getCurrentInteraction().setOutputMessage(
      new ChatMessage({
        role: "assistant",
        content: message,
        name: agentName,
      }),
    );

    return message;
  }

  public getCurrentInteraction(): Interaction {
    return this.interactions[this.interactions.length - 1];
  }

  public getInteractions(contextLength: number = -1): Interaction[] {
    if (contextLength === 0) {
      return [];
    }

    let interactions = [...this.interactions];
    if (contextLength > 0) {
      interactions = interactions.slice(-contextLength);
    }
    return interactions;
  }

  reset(messages: ChatMessage[]): Conversation {
    this.interactions.length = 0; // Clear the interactions
    for (const message of messages) {
      this.appendMessage(message);
    }
    return this;
  }

  getMessages(contextLength: number = -1): ChatMessage[] {
    return this.getMessagesWithInteraction(contextLength).map(
      ({ message }) => message,
    );
  }

  getMessagesWithInteraction(contextLength: number = -1): {
    message: ChatMessage;
    interaction: Interaction;
  }[] {
    const messages: {
      message: ChatMessage;
      interaction: Interaction;
    }[] = [];
    for (const interaction of this.getInteractions(contextLength)) {
      if (interaction.inputMessage) {
        messages.push({
          message: interaction.inputMessage,
          interaction: interaction,
        });
      }
      if (interaction.outputMessage && !interaction.outputMessage.isEmpty()) {
        messages.push({
          message: interaction.outputMessage,
          interaction: interaction,
        });
      }
    }
    return messages;
  }

  public getKey(): string {
    return `conversation_${this.datetime}_${this.uuid}`;
  }

  public getUuid(): string {
    return this.uuid;
  }

  public getDatetime(): string {
    return this.datetime;
  }

  public getSystemPrompt(): string {
    return this.systemPrompt;
  }

  public setSystemPrompt(systemPrompt: string): void {
    this.systemPrompt = systemPrompt;
  }
}

interface ConversationSerializer {
  toString(conversation: Conversation): string;
}

class ConversationJsonSerializer implements ConversationSerializer {
  private readonly contextLength: number = -1;
  private readonly filter: (interaction: Interaction) => boolean;

  constructor(
    contextLength: number = -1,
    filter: (interaction: Interaction) => boolean = () => true,
  ) {
    this.contextLength = contextLength;
    this.filter = filter;
  }

  private toJSONString(conversation: Conversation): string {
    if (this.contextLength === 0) {
      return JSON.stringify([]);
    }

    let interactions = conversation.getInteractions(this.contextLength);
    interactions = interactions.filter((i) => this.filter(i));

    const jsonObjects = interactions.map((i) => ({
      goal: i.getGoal() ?? "",
      user: i.inputMessage?.getContentText() ?? "",
      assistant: i.outputMessage?.getContentText() ?? "",
    }));
    return JSON.stringify(jsonObjects);
  }

  toString(conversation: Conversation): string {
    return this.toJSONString(conversation);
  }
}

export default Conversation;
export { ConversationSerializer, ConversationJsonSerializer };
