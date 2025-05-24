import { v4 as uuidv4 } from "uuid";
import ChatMessage from "./ChatMessage";
import Environment from "./Environment";

type InteractionStatus =
  | "Start"
  | "Planning"
  | "Reflecting"
  | "Executing"
  | "Completed";

/**
 * A step is a single action taken by the agent.
 * - Type: plan, the agent is understanding the user intent, and output is the goal of the interaction
 * - Type: intent, the agent is choosing the actions to execute, and output is the action and the arguments
 * - Type: execute, the agent is executing the action with the arguments, and output is the action result
 * - Type: reflect, the agent is reflecting on the action result, and output is the result of the reflection
 * It contains the reasoning, action, action arguments, action result, result, and error.
 */
class Step {
  type: "plan" | "intent" | "execute" | "reflect" = "execute";
  action: string = "";
  arguments: any = {};
  actionResult: any = {};

  reasoning: string = "";
  content: string = "";
  result: string = "";

  error?: string;
  datetime: string = new Date().toISOString();

  public static plan(
    goal: string,
    steps: string[],
    reasoning: string,
    content: string,
    result: string,
  ): Step {
    const step = new Step();
    step.type = "plan";
    step.actionResult = {
      goal: goal,
      steps: steps,
    };
    step.reasoning = reasoning;
    step.content = content;
    step.result = result;
    return step;
  }
}

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
  outputMessage?: ChatMessage;
  environment?: Environment;
  steps: Step[] = [];

  listener: () => void;

  public constructor(chatMessage: ChatMessage) {
    this.goal = "";
    this.intent = "";
    this.status = "Start";
    this.statusMessage = "";
    this.agentName = "";
    this.inputMessage = chatMessage;
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

  public addStep(step: Step) {
    this.steps.push(step);
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
export { Step };
