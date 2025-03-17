import SensitiveTopicError from "./errors/SensitiveTopicError";

/**
 * Action type
 * @enum {string}
 * @property {string} actions - should take actions
 * @property {string} message - should reply with message
 * @property {string} stream - should reply with stream message
 * @property {string} error - should handle error
 * @readonly
 */
type ThoughtType = "actions" | "message" | "stream" | "error";

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
}

class Thought {
  public readonly type: ThoughtType;
  public readonly model: string;
  public readonly modelType: ModelType;
  public readonly actions?: Action[];
  public readonly stream?: AsyncIterator<any>;
  public readonly message?: string;
  public readonly error?: Error;
  private streamMessage: string;

  constructor({
    type,
    model,
    modelType,
    actions,
    stream,
    message,
    error,
  }: ThoughtProps) {
    this.type = type;
    this.model = model ?? "";
    this.modelType = modelType ?? "agent";
    this.actions = actions;
    this.stream = stream;
    this.message = message;
    this.error = error;
  }

  public async getMessage(
    notifyMessageChanged: (msg: string) => void = undefined,
  ): Promise<string> {
    if (this.type === "stream") {
      if (this.streamMessage) {
        return this.streamMessage;
      }
      this.streamMessage = await this.readMessageFromStream(
        this.stream,
        notifyMessageChanged,
      );
      return this.streamMessage;
    } else if (this.type === "message") {
      return this.message;
    }
    throw new Error("Cannot get message from this thought.");
  }

  private async readMessageFromStream(
    stream: any,
    notifyMessageChanged: (msg: string) => void,
  ): Promise<string> {
    let message = "";
    for await (const chunk of stream) {
      if (chunk.choices) {
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason === "sensitive") {
          throw new SensitiveTopicError();
        }
        const content = chunk.choices[0]?.delta?.content ?? "";
        message = message + content;
      } else {
        // When stream is not from openai chat completion, but an AsyncIterator
        message = message + chunk.data;
      }
      // Notify message changed, for rendering in UI
      if (notifyMessageChanged) {
        notifyMessageChanged(message);
      }
    }
    return message;
  }
}

export default Thought;
export { ThoughtProps, ThoughtType, ModelType };
