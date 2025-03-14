import type { MessageContent } from "../core/ChatMessage";
import ChatMessage from "../core/ChatMessage";
import ModelService, { ModelProvider, ModelServiceProps } from "./ModelService";
import Thought from "../core/Thought";
import OpenAI from "openai";
import {
  ChatCompletion,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsBase,
  ChatCompletionMessageParam,
} from "openai/src/resources/chat/completions";
import { withTimeout } from "../AgentUtils";

class DefaultModelService implements ModelService {
  client: OpenAI;
  modelName: string;
  reasoningModel: string;
  toolsCallModel: string;
  multimodalModel: string;
  modelProviders: ModelProvider[] = ["zhipu.ai", "custom"];
  supportedModels: string[] = ["glm-4-plus", "glm-4v-plus"];
  maxTokens: number = 8192;

  constructor(props: ModelServiceProps) {
    const {
      client,
      modelName,
      reasoningModel,
      toolsCallModel,
      multimodalModel,
    } = props;
    this.client = client;
    this.modelName = modelName;
    this.reasoningModel = reasoningModel;
    this.toolsCallModel = toolsCallModel;
    this.multimodalModel = multimodalModel;
  }

  hasReasoningModel(): boolean {
    return this.reasoningModel !== "";
  }

  isReasoningModel(model: string): boolean {
    return this.hasReasoningModel() && model === this.reasoningModel;
  }

  isMultimodalModel(modelName: string): boolean {
    return ["glm-4v", "glm-4v-plus", "glm-4v-flash", "gpt-4o-mini"].includes(
      modelName,
    );
  }

  async chatCompletion(
    messages: ChatMessage[],
    stream: boolean,
    useMultimodal: boolean = false,
    responseType: "text" | "json_object" = "text",
  ): Promise<Thought> {
    const model = useMultimodal ? this.multimodalModel : this.modelName;
    const body: ChatCompletionCreateParamsBase = {
      messages: this.formatMessageContent(
        messages,
        model,
      ) as ChatCompletionMessageParam[],
      model: model,
      stream: stream,
      response_format: {
        type: responseType,
      } as ChatCompletionCreateParams.ResponseFormat,
    };

    if (!useMultimodal) {
      body.max_tokens = this.maxTokens; // max tokens for non multimodal models
    }

    try {
      const result = await withTimeout(
        this.client.chat.completions.create(body),
        "Chat completion timed out",
        30000,
      );
      if (stream) {
        return new Thought({ type: "stream", stream: result });
      }
      const message = (result as ChatCompletion).choices[0].message.content;
      return new Thought({ type: "message", message: message });
    } catch (error) {
      return new Thought({ type: "error", error: error });
    }
  }

  /**
   * While using multimodal models, the content in messages should be MessageContent[]
   * While using llm models, the content in messages should be string
   * @param {ChatMessage[]} messages
   * @returns messages
   * @private
   */
  protected formatMessageContent(
    messages: ChatMessage[],
    model: string,
  ): ChatMessage[] {
    if (this.isMultimodalModel(model)) {
      if (this.includeStringContent(messages)) {
        return messages.map((msg) => {
          let content = msg.content;
          if (typeof content === "string") {
            content = [{ type: "text", text: content }];
          }
          return new ChatMessage({
            role: msg.role,
            content: content,
            name: msg.name,
          });
        });
      }
    } else {
      return messages.map((msg) => {
        let content = msg.content;
        if (typeof content !== "string") {
          content = (msg.content as MessageContent[]).find(
            (c) => c.type === "text",
          )?.text;
        }
        return new ChatMessage({
          role: msg.role,
          content: content,
          name: msg.name,
        });
      });
    }
    return messages;
  }

  protected includeStringContent(messages: ChatMessage[]) {
    return messages.findIndex((msg) => typeof msg.content === "string") >= 0;
  }

  async toolsCall(
    messages: ChatMessage[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    stream: boolean,
    responseType: "text" | "json_object" = "text",
  ): Promise<Thought> {
    if (stream) {
      return await this.streamToolsCall(messages, tools, responseType);
    }

    return await this.nonStreamToolsCall(messages, tools, responseType);
  }

  protected async nonStreamToolsCall(
    messages: ChatMessage[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    responseType: "text" | "json_object" = "text",
  ) {
    const result = await this.client.chat.completions.create({
      model: this.toolsCallModel,
      max_tokens: this.maxTokens,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      stream: false,
      tools: tools,
      response_format: {
        type: responseType,
      } as ChatCompletionCreateParams.ResponseFormat,
    });
    let actions = [];
    const choices = result.choices;
    if (choices.length > 0) {
      const choice = choices[0];
      if (choice.finish_reason === "tool_calls") {
        const tools = choice.message.tool_calls;
        if (tools) {
          actions = tools.map((t) => this.toAction(t as ToolCall));
        }
      } else if (choice.finish_reason === "stop" && choice.message.content) {
        return new Thought({
          type: "message",
          message: choice.message.content,
        });
      }
    }
    return new Thought({ type: "actions", actions: actions });
  }

  protected async streamToolsCall(
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
    let actions = [];
    for await (const chunk of first) {
      if (chunk.choices) {
        if (chunk.choices.length == 0) {
          throw new Error("Empty choices in chunk");
        }
        const choice = chunk.choices[0];
        if (choice.finish_reason === "tool_calls") {
          const tools = choice.delta.tool_calls;
          if (tools) {
            actions = tools.map((t) => this.toAction(t as ToolCall));
          }
        } else {
          return new Thought({
            type: "stream",
            stream: second,
          });
        }
      }
    }

    return new Thought({ type: "actions", actions });
  }

  protected toAction(tool: ToolCall): Action {
    let args = {};
    try {
      if (tool.function.arguments) {
        args = JSON.parse(tool.function.arguments);
      }
    } catch (e) {
      console.error("Error parsing tool arguments", e);
      console.error("tool.function.arguments", tool.function.arguments);
    }
    return { name: tool.function.name, arguments: args } as Action;
  }
}

export default DefaultModelService;
