import ChatMessage, { type MessageContent } from "../core/ChatMessage";
import Thought, { ModelType } from "../core/Thought";
import OpenAI from "openai";

type ModelProvider =
  | "zhipu.ai"
  | "openai.com"
  | "ollama"
  | "deepseek"
  | "custom";

interface ModelServiceProps {
  client: OpenAI;
  modelName: string;
  reasoningModel: string;
  toolsCallModel: string;
  multimodalModel: string;
}

interface ChatCompletionParams {
  messages: ChatMessage[];
  systemPrompt?: string;
  userInput?: string | MessageContent[];
  stream?: boolean;
  useMultimodal?: boolean;
  useReasoningModel?: boolean;
  responseType?: "text" | "json_object";
}

interface ChatCompletionTools {
  messages: ChatMessage[];
  tools: OpenAI.Chat.Completions.ChatCompletionTool[];
  stream?: boolean;
  responseType?: "text" | "json_object";
}

interface ModelService {
  /**
   * Model name
   */
  modelName: string;

  /**
   * Model name
   */
  reasoningModel: string;

  /**
   * Tools call model
   */
  toolsCallModel: string;

  /**
   * Model providers
   */
  modelProviders: ModelProvider[];

  /**
   * Supported models
   */
  supportedModels: string[];

  /**
   * Decide if it has reasoning model
   * @returns {bool} has reasoning model
   */
  hasReasoningModel(): boolean;

  /**
   * Decide if it has reasoning model
   * @returns {bool} has reasoning model
   */
  getModelType(model: string): ModelType;

  /**
   * Decide if it is multimodal model
   * @param {string} modelName - model name
   * @returns {bool} is multimodal model
   */
  isMultimodalModel(modelName: string): boolean;

  /**
   * Chat completion
   * @param {ChatCompletionParams} params - Chat completion params
   * @returns {Promise<Thought>} ThinkResult
   */
  chatCompletion(params: ChatCompletionParams): Promise<Thought>;

  /**
   * Tools call
   * @param {ChatCompletionTools} params - Chat completion tools
   * @returns {Promise<Thought>} ThinkResult
   */
  toolsCall(params: ChatCompletionTools): Promise<Thought>;
}

export default ModelService;
export type { ModelProvider, ChatCompletionParams, ChatCompletionTools };
export { ModelServiceProps };
