import ChatMessage from "../core/ChatMessage";
import { ModelProvider, ModelServiceProps } from "./ModelService";
import Thought from "../core/Thought";
import OpenAI from "openai";
import { ChatCompletionCreateParams } from "openai/src/resources/chat/completions";
import DefaultModelService from "@src/shared/agents/services/DefaultModelService";

class DeepSeekModelService extends DefaultModelService {
  override modelProviders: ModelProvider[] = ["deepseek"];
  override supportedModels: string[] = ["deepseek-chat", "deepseek-reasoner"];

  constructor(props: ModelServiceProps) {
    super(props);
  }

  override isMultimodalModel(modelName: string): boolean {
    return false;
  }

  /**
   * In deepseek, the action name and the argument list are in seperated chunks.
   * @param messages
   * @param tools
   * @param responseType
   * @protected
   */
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
    const actions: Action[] = [];
    let currentAction: Action = null;
    const argumentList: string[] = [];
    for await (const chunk of first) {
      if (chunk.choices) {
        if (chunk.choices.length == 0) {
          throw new Error("Empty choices in chunk");
        }
        const choice = chunk.choices[0];
        const tools = choice.delta?.tool_calls;
        if (tools && tools.length > 0) {
          if (tools[0].function.name) {
            const parsedActions = tools.map((t) =>
              this.toAction(t as ToolCall),
            );
            if (parsedActions.length === 1) {
              currentAction = parsedActions[0];
            }
            actions.push(...parsedActions);
          } else if (tools[0].function.arguments) {
            const args = tools[0].function.arguments;
            if (args.length > 0) {
              argumentList.push(args);
            }
          }
        }

        if (choice.finish_reason && choice.finish_reason !== "tool_calls") {
          if (!tools) {
            return new Thought({
              model: this.toolsCallModel,
              modelType: "tools",
              type: "stream",
              stream: second,
            });
          }
        }
      }
    }

    // Parse arguments if they are not empty, then assign to currentAction
    if (argumentList.length > 0) {
      currentAction.arguments = JSON.parse(argumentList.join(""));
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

export default DeepSeekModelService;
