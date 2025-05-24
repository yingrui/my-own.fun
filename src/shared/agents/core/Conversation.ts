import Interaction from "./Interaction";
import { v4 as uuidv4 } from "uuid";
import ChatMessage from "./ChatMessage";

class Conversation {
  private readonly uuid: string;
  private readonly datetime: string;
  private interactions: Interaction[] = [];

  constructor() {
    this.uuid = uuidv4();
    this.datetime = new Date().toISOString();
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
    if (this.getCurrentInteraction()) {
      // When agent can only handle some tasks, there is won't be any interaction.
      this.getCurrentInteraction().setOutputMessage(message);
    }
    return this;
  }

  public getCurrentInteraction(): Interaction {
    return this.interactions[this.interactions.length - 1];
  }

  public getInteraction(message: ChatMessage): Interaction {
    const found = this.interactions.findLast((interaction) => {
      if (message.role === "user") {
        return (
          interaction.inputMessage.getContentText() === message.getContentText()
        );
      } else if (message.role === "assistant" && interaction.outputMessage) {
        return (
          interaction.outputMessage.getContentText() ===
          message.getContentText()
        );
      }
      return false;
    });
    return found;
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
    const interactions = this.getInteractions(contextLength);
    const messages: ChatMessage[] = [];
    for (const interaction of interactions) {
      if (interaction.inputMessage) {
        messages.push(interaction.inputMessage);
      }
      if (interaction.outputMessage) {
        messages.push(interaction.outputMessage);
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

  public toJSONString(
    contextLength: number = -1,
    filter: (interaction: Interaction) => boolean = () => true,
  ): string {
    if (contextLength === 0) {
      return JSON.stringify([]);
    }

    let interactions = this.getInteractions(contextLength);
    interactions = interactions.filter((i) => filter(i));

    const jsonObjects = interactions.map((i) => ({
      goal: i.getGoal() ?? "",
      user: i.inputMessage?.getContentText() ?? "",
      assistant: i.outputMessage?.getContentText() ?? "",
    }));
    return JSON.stringify(jsonObjects);
  }
}

export default Conversation;
