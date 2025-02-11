import { v4 as uuidv4 } from "uuid";
import ChatMessage from "./ChatMessage";
import Environment from "./Environment";

type InteractionStatus =
  | "Start"
  | "Planning"
  | "Reflecting"
  | "Executing"
  | "Completed";

class Interaction {
  private readonly uuid: string;
  private readonly datetime: string;
  private goal: string; // State is the description of user intents, for example: "Searching", "Viewing", etc.
  intent: string; // The specific intent, for example: "google_search", "open_url", etc.
  intentArguments?: any; // The arguments of the intent
  status: InteractionStatus; // the status of agent
  statusMessage: string; // the message of the status
  agentName: string; // the name of the agent
  inputMessage: ChatMessage;
  inputMessageIndex: number;
  outputMessage?: ChatMessage;
  environment?: Environment;

  listener: () => void;

  public constructor(chatMessage: ChatMessage, chatMessages: ChatMessage[]) {
    this.goal = "";
    this.intent = "";
    this.status = "Start";
    this.statusMessage = "";
    this.agentName = "";
    this.inputMessage = chatMessage;
    this.inputMessageIndex = chatMessages.lastIndexOf(chatMessage);
    this.uuid = uuidv4();
    this.datetime = new Date().toISOString();
  }

  public setOutputMessage(message: ChatMessage) {
    this.outputMessage = message;
  }

  public setStatus(status: InteractionStatus, statusMessage: string) {
    this.status = status;
    this.statusMessage = statusMessage;
    this.notify();
  }

  public getStatus(): string {
    return this.status;
  }

  public getStatusMessage(): string {
    return this.statusMessage;
  }

  public getGoal(): string {
    return this.goal;
  }

  public setGoal(goal: string) {
    this.goal = goal;
    this.notify();
  }

  public setIntent(intent: string, intentArguments: any) {
    this.intent = intent;
    this.intentArguments = intentArguments;
    this.notify();
  }

  public setAgentName(agent: string) {
    this.agentName = agent;
    this.notify();
  }

  private notify() {
    this.listener && this.listener();
  }

  /**
   * On state change
   * @param listener
   */
  public onChange(listener: () => void) {
    this.listener = listener;
  }

  public getUuid(): string {
    return this.uuid;
  }

  public getDatetime(): string {
    return this.datetime;
  }
}

export default Interaction;
export type { InteractionStatus };
