import ChatMessage from "../core/ChatMessage";
import Thought from "../core/Thought";
import OpenAI from "openai";

type ModelProvider = "zhipu.ai" | "openai.com" | "ollama" | "custom";

interface ModelServiceProps {
  client: OpenAI;
  modelName: string;
  reasoningModel: string;
  toolsCallModel: string;
  multimodalModel: string;
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
   * Decide if it is multimodal model
   * @param {string} modelName - model name
   * @returns {bool} is multimodal model
   */
  isMultimodalModel(modelName: string): boolean;

  /**
   * Chat completion
   * @param {ChatMessage[]} messages - Messages
   * @param {bool} stream - Stream
   * @param {bool} useMultimodal - Use multimodal
   * @param {string} responseType - Response type
   * @returns {Promise<Thought>} ThinkResult
   */
  chatCompletion(
    messages: ChatMessage[],
    stream: boolean,
    useMultimodal: boolean,
    responseType: "text" | "json_object",
  ): Promise<Thought>;

  /**
   * Tools call
   * @param {ChatMessage[]} messages - Messages
   * @param {OpenAI.Chat.Completions.ChatCompletionTool[]} tools - Tools
   * @param {bool} stream - Stream
   * @param {string} responseType - Response type
   * @returns {Promise<Thought>} ThinkResult
   */
  toolsCall(
    messages: ChatMessage[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    stream: boolean,
    responseType: "text" | "json_object",
  ): Promise<Thought>;
}

export default ModelService;
export type { ModelProvider };
export { ModelServiceProps };
