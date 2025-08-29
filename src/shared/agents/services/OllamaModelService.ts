import ChatMessage from "../core/ChatMessage";
import { ModelProvider, ModelServiceProps } from "./ModelService";
import Thought from "../core/Thought";
import OpenAI from "openai";
import { ChatCompletionCreateParams } from "openai/src/resources/chat/completions";
import DefaultModelService from "@src/shared/agents/services/DefaultModelService";

class OllamaModelService extends DefaultModelService {
  override modelProviders: ModelProvider[] = ["ollama"];
  override supportedModels: string[] = [
    "deepseek-r1",
    "llama3.1",
    "qwq",
    "qwen2.5",
    "qwen3",
    "glm4",
  ];

  constructor(props: ModelServiceProps) {
    super(props);
  }

  override isMultimodalModel(modelName: string): boolean {
    return ["llava"].includes(modelName);
  }

  protected override async streamToolsCall(
    messages: ChatMessage[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    responseType: "text" | "json_object" = "text",
  ) {
    const result = await this.client.chat.completions.create({
      model: this.toolsCallModel,
      max_tokens: this.maxTokens,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      stream: true,
      tools: tools,
      response_format: {
        type: responseType,
      } as ChatCompletionCreateParams.ResponseFormat,
    });
    const [first, second] = result.tee();
    const actions = [];
    let index = 0;
    for await (const chunk of first) {
      if (chunk.choices) {
        if (chunk.choices.length == 0) {
          throw new Error("Empty choices in chunk");
        }
        const choice = chunk.choices[0];
        const tools = choice.delta?.tool_calls;
        if (tools) {
          actions.push(...tools.map((t) => this.toAction(t as ToolCall)));
        }
        if (choice.finish_reason !== "tool_calls") {
          if (actions.length == 0 && index >= 4) {
            // The Ollama model return empty <think></think> tags,
            // so we need to check if model return chose tools when index is greater than 4
            return new Thought({
              model: this.toolsCallModel,
              modelType: "tools",
              type: "stream",
              stream: second,
            });
          }
        }
      }
      index += 1;
    }

    // even if the actions is empty, the trackingDialogueState will handle it.
    return new Thought({
      model: this.toolsCallModel,
      modelType: "tools",
      type: "actions",
      actions,
    });
  }
}

export default OllamaModelService;
