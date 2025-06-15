import { v4 as uuidv4 } from "uuid";
import ChatMessage from "./ChatMessage";
import Environment from "./Environment";
import { PlanResult } from "@src/shared/agents/services/ThoughtService";
import {
  EvaluationScore,
  ReflectionStatus,
} from "@src/shared/agents/services/ReflectionService";

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
  type: "plan" | "execute" | "reflect" = "execute";
  action: string = "";
  arguments: any = {};
  actionResult: string = "";

  reasoning: string = "";
  content: string = "";
  result: string = "";

  error?: Error;
  datetime: string = new Date().toISOString();

  public setMessage(message: string) {
    this.result = message;
    if (message.startsWith("<think>")) {
      const match = message.match(/<think>([\s\S]*?)<\/think>/g);
      if (match) {
        const reasoning = match[0];
        const content = message.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        this.reasoning = reasoning; // The reasoning is the first part of the message.
        this.content = content; // The content is the rest of the message.
      } else {
        this.reasoning = message.replace(/<think>/g, "");
        this.content = ""; // The content is empty because the reasoning is not complete yet.
      }
    } else {
      this.content = message;
    }
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
  outputMessage: ChatMessage;
  environment?: Environment;
  steps: Step[] = [];
  currentStep: Step | null = null;

  listener: () => void;

  public constructor(chatMessage: ChatMessage) {
    this.goal = "";
    this.intent = "";
    this.status = "Start";
    this.statusMessage = "";
    this.agentName = "";
    this.inputMessage = chatMessage;
    this.outputMessage = new ChatMessage({
      role: "assistant",
      content: "",
      name: "",
    });
    this.uuid = uuidv4();
    this.datetime = new Date().toISOString();
  }

  public setOutputMessage(message: ChatMessage) {
    this.outputMessage = message;
  }

  public updateOutputMessage(name: string, content: string) {
    if (this.outputMessage) {
      this.outputMessage.name = name;
      this.outputMessage.content = content;
    } else {
      this.outputMessage = new ChatMessage({
        role: "assistant",
        content: content,
        name: name,
      });
    }
    this.notify();
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
    const step = this.steps.find((step) => step.type === "plan");
    if (step) {
      return step.result;
    }
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

  public getSteps(): Step[] {
    return this.steps;
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

  // State Management Methods
  public beginPlan(): void {
    this.setStatus("Planning", `${this.agentName} is thinking...`);
    this.currentStep = new Step();
    this.currentStep.type = "plan";
    this.addStep(this.currentStep);
  }

  public planCompleted(planResult: PlanResult): void {
    this.setGoal(planResult.goal);

    if (this.currentStep) {
      this.currentStep.actionResult = JSON.stringify(
        {
          goal: planResult.goal,
          steps: planResult.steps,
        },
        null,
        2,
      );
      this.currentStep.reasoning = planResult.reasoning;
      this.currentStep.content = planResult.content;
      this.currentStep.result = planResult.result;
      this.currentStep = null;
    }
  }

  public beginProcess(): void {
    this.currentStep = new Step();
    this.addStep(this.currentStep);
  }

  public confirmProcessAction(action: { name: string; arguments: any }): void {
    if (this.currentStep) {
      this.currentStep.type = "execute";
      this.currentStep.action = action.name;
      this.currentStep.arguments = action.arguments;
    }
  }

  public updateProcessActionResult(result: string): void {
    if (this.currentStep) {
      this.currentStep.actionResult = result;
    }
  }

  public updateProcessActionError(error: Error): void {
    if (this.currentStep) {
      this.currentStep.error = error;
    }
  }

  public processCompleted(result: string): void {
    if (this.currentStep) {
      const match = result.match(/<think>([\s\S]*?)<\/think>/g);
      const reasoning = match ? match[0] : undefined;
      const content = result.replace(/<think>[\s\S]*?<\/think>/g, "");
      this.currentStep.result = result;
      this.currentStep.reasoning = reasoning;
      this.currentStep.content = content;
      this.currentStep = null;
    }
  }

  public beginReflection(): void {
    this.currentStep = new Step();
    this.setStatus("Reflecting", `${this.agentName} is reflecting...`);
  }

  public reflectionCompleted(
    status: ReflectionStatus,
    result: string,
    evaluation: EvaluationScore,
  ): void {
    if (status === "revised" && this.currentStep) {
      this.currentStep.type = "reflect";
      this.currentStep.action = "revise";
      this.currentStep.arguments = evaluation;
      const match = result.match(/<think>([\s\S]*?)<\/think>/g);
      const reasoning = match ? match[0] : undefined;
      const content = result.replace(/<think>[\s\S]*?<\/think>/g, "");
      this.currentStep.result = result;
      this.currentStep.reasoning = reasoning;
      this.currentStep.content = content;

      this.addStep(this.currentStep);
    }

    this.currentStep = null;
  }

  public getCurrentStep(): Step | null {
    return this.currentStep;
  }
}

export default Interaction;
export type { InteractionStatus };
export { Step };
