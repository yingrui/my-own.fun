import Interaction from "./Interaction";
import { v4 as uuidv4 } from "uuid";
import ChatMessage from "./ChatMessage";

class Conversation {
  private readonly uuid: string;
  private readonly datetime: string;
  interactions: Interaction[] = [];
  messages: ChatMessage[];

  constructor(messages: ChatMessage[] = []) {
    this.messages = messages;
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
    if (message.role === "user") {
      this.messages.push(message);
      this.interactions.push(new Interaction(message, this.messages));
    } else {
      console.error("Only user messages can be appended to the conversation");
    }
    return this;
  }

  private appendAssistantMessage(message: ChatMessage): Conversation {
    if (message.role === "assistant") {
      this.messages.push(message);
      if (this.getCurrentInteraction()) {
        // When agent can only handle some tasks, there is won't be any interaction.
        this.getCurrentInteraction().setOutputMessage(message);
      }
    } else {
      console.error(
        "Only assistant messages can be appended to the conversation",
      );
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

  reset(messages: ChatMessage[]): Conversation {
    this.messages = [...messages];
    this.interactions.length = 0; // Clear the interactions
    return this;
  }

  getMessages(): ChatMessage[] {
    return this.messages;
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

  public toString(): string {
    return this.interactions
      .map(
        (i) => `user goal: ${i.getGoal()}
user: ${i.inputMessage.getContentText()}
assistant: ${i.outputMessage?.getContentText()}
`,
      )
      .join("\n");
  }
}

export default Conversation;
