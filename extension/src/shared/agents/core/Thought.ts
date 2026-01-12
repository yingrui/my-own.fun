import SensitiveTopicError from "./errors/SensitiveTopicError";

/**
 * Action type
 * @enum {string}
 * @property {string} actions - should take actions
 * @property {string} message - should reply with message
 * @property {string} stream - should reply with stream message
 * @property {string} error - should handle error
 * @property {string} functionReturn - should process return value from function
 * @readonly
 */
type ThoughtType =
  | "actions"
  | "message"
  | "stream"
  | "error"
  | "functionReturn";

/**
 * Model type - the thought is come from which type of model
 * @enum {string}
 * @property {string} llm - LLM model
 * @property {string} tools - Tools model
 * @property {string} reasoning - Reasoning model
 * @property {string} multimodal - Multimodal model
 * @property {string} agent - thought is from agent, the model is not specified
 * @readonly
 */
type ModelType = "llm" | "tools" | "reasoning" | "multimodal" | "agent";

interface ThoughtProps {
  type: ThoughtType;
  model?: string;
  modelType?: ModelType;
  actions?: Action[];
  stream?: any;
  message?: string;
  error?: Error;
  returnValue?: any;
}

class Thought {
  public readonly type: ThoughtType;
  public readonly model: string;
  public readonly modelType: ModelType;
  public readonly actions?: Action[];
  public readonly stream?: AsyncIterator<any>;
  public readonly message?: string;
  public readonly error?: Error;
  public readonly returnValue?: any;
  private streamMessage: string;
  private streamReasoningMessage: string;
  private streamMessageWithReasoning: string;

  constructor({
    type,
    model,
    modelType,
    actions,
    stream,
    message,
    error,
    returnValue,
  }: ThoughtProps) {
    this.type = type;
    this.model = model ?? "";
    this.modelType = modelType ?? "agent";
    this.actions = actions;
    this.stream = stream;
    this.message = message;
    this.error = error;
    this.returnValue = returnValue;
  }

  public async getMessage(
    notifyMessageChanged: (msg: string) => void = undefined,
  ): Promise<string> {
    if (this.type === "stream") {
      if (this.streamMessageWithReasoning) {
        return this.streamMessageWithReasoning;
      }
      this.streamMessageWithReasoning = await this.readMessageFromStream(
        this.stream,
        notifyMessageChanged,
      );
      return this.streamMessageWithReasoning;
    } else if (this.type === "message") {
      return this.message;
    } else if (this.type === "functionReturn") {
      return this.isString(this.returnValue)
        ? this.returnValue
        : JSON.stringify(this.returnValue, null, 2);
    } else if (this.type === "error") {
      throw this.error;
    }
    throw new Error("Cannot get message from this thought.");
  }

  private isString(value: any): boolean {
    return typeof value === "string" || value instanceof String;
  }

  private async readMessageFromStream(
    stream: any,
    notifyMessageChanged: (msg: string) => void,
  ): Promise<string> {
    let message = "";
    let reasoningMessage = "";
    for await (const chunk of stream) {
      if (chunk.choices) {
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason === "sensitive") {
          throw new SensitiveTopicError();
        }
        const content = chunk.choices[0]?.delta?.content ?? "";
        if (content !== "") {
          message = message + content;
        }
        const reasoningContent =
          chunk.choices[0]?.delta?.reasoning_content ?? "";
        if (reasoningContent !== "") {
          reasoningMessage = reasoningMessage + reasoningContent;
        }
      } else {
        // When stream is not from openai chat completion, but an AsyncIterator
        message = message + chunk.data;
      }
      // Notify message changed, for rendering in UI
      if (notifyMessageChanged) {
        notifyMessageChanged(
          this.formatMessageWithReasoning(message, reasoningMessage),
        );
      }
    }
    this.streamReasoningMessage = reasoningMessage;
    this.streamMessage = message;
    return this.formatMessageWithReasoning(message, reasoningMessage);
  }

  private formatMessageWithReasoning(
    message: string,
    reasoningMessage: string,
  ): string {
    if (reasoningMessage) {
      // Compactible with Ollama
      // Add <think> and </think> to the reasoning message
      return "<think>\n" + reasoningMessage + "</think>\n\n" + message;
    }
    return message;
  }

  public isAction(): boolean {
    return this.type === "actions" && this.actions.length > 0;
  }
}

export default Thought;
export { ThoughtProps, ThoughtType, ModelType };
