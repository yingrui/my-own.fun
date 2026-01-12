import ChatMessage from "../core/ChatMessage";
import ReflectionService, {
  EvaluationScore,
  ReflectionResult,
  Suggestions,
} from "./ReflectionService";
import Thought from "../core/Thought";
import ModelService from "./ModelService";
import Environment from "../core/Environment";
import Conversation, { ConversationJsonSerializer } from "../core/Conversation";
import ToolDefinition from "../core/ToolDefinition";
import ThoughtService, { PlanResult } from "./ThoughtService";
import TemplateEngine from "./TemplateEngine";
import PromptTemplate from "./PromptTemplate";
import { getClassName } from "../../utils/reflection";
import Interaction from "../core/Interaction";

class PromptChainOfThoughtService implements ReflectionService, ThoughtService {
  private readonly modelService: ModelService;
  private readonly language: string;
  private templateEngine: TemplateEngine;
  private readonly contextLength: number;

  constructor(
    modelService: ModelService,
    language: string,
    templateEngine: TemplateEngine,
    contextLength: number,
  ) {
    this.modelService = modelService;
    this.language = language;
    this.templateEngine = templateEngine;
    this.contextLength = contextLength;
  }

  async goal(
    env: Environment,
    conversation: Conversation,
    contextMessages: ChatMessage[],
    tools: ToolDefinition[],
  ): Promise<Thought> {
    return await this.modelService.chatCompletion({
      messages: [
        ...contextMessages,
        new ChatMessage({
          role: "system",
          content: await this.getGoalPrompt(env, conversation, tools),
        }),
      ],
      stream: true,
      useMultimodal: false,
      useReasoningModel: true,
      responseType: "text",
    });
  }

  async reflection(
    env: Environment,
    conversation: Conversation,
    messages: ChatMessage[],
    tools: ToolDefinition[],
  ): Promise<ReflectionResult> {
    const result = await this.reviewConversation(
      messages,
      tools,
      env,
      conversation,
    );

    if (result.type === "message") {
      try {
        const score = JSON.parse(result.message) as EvaluationScore;
        const evaluation: string = score.evaluation || "finished";
        if (evaluation === "finished") {
          // If the answer is good enough, then return the previous message
          return {
            status: "finished",
            thought: this.previousMessage(conversation),
            evaluation: score,
          };
        }
        if (evaluation === "suggest") {
          return {
            status: "actions",
            thought: new Thought({
              type: "actions",
              actions: [{ name: "revise", arguments: score }],
            }),
            evaluation: score,
          };
        }
      } catch (e) {
        return {
          status: "error",
          thought: new Thought({
            type: "error",
            error: e,
          }),
        };
      }
    } else if (result.type === "actions") {
      return { status: "actions", thought: result };
    }
    // If the result is not message or actions, then return the previous message
    return { status: "unknown", thought: this.previousMessage(conversation) };
  }

  private previousMessage(conversation: Conversation) {
    const currentInteraction = conversation.getCurrentInteraction();
    const previousMessage = currentInteraction.getSteps().at(-1)?.content;
    return new Thought({ type: "message", message: previousMessage ?? "" });
  }

  private async reviewConversation(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    env: Environment,
    conversation: Conversation,
  ) {
    const toolCalls = tools.map((t) => t.getFunction());
    toolCalls.push({
      type: "function",
      function: {
        name: "revise",
        description: "Revise the last answer based on the feedback",
        parameters: {
          type: "object",
          properties: {
            feedback: {
              type: "string",
              description: "The feedback to revise the last answer",
            },
          },
        },
      },
    });
    return await this.modelService.toolsCall({
      messages: [
        ...messages,
        new ChatMessage({
          role: "system",
          content: this.getReflectionPrompt(),
        }),
      ],
      tools: toolCalls,
      stream: false,
      responseType: "json_object",
    });
  }

  async revise(
    env: Environment,
    conversation: Conversation,
    messages: ChatMessage[],
    evaluation: EvaluationScore,
  ): Promise<Thought> {
    const feedback = evaluation.feedback;
    if (feedback) {
      return await this.modelService.chatCompletion({
        messages: [
          ...messages,
          new ChatMessage({
            role: "system",
            content: this.getRevisePrompt(feedback),
          }),
        ],
        stream: true,
        useMultimodal: false,
        useReasoningModel: false,
        responseType: "text",
      });
    }
    return new Thought({
      type: "error",
      error: new Error("Feedback is required"),
    });
  }

  async suggest(
    env: Environment,
    conversation: Conversation,
  ): Promise<Suggestions> {
    const result = await this.modelService.chatCompletion({
      messages: [
        new ChatMessage({
          role: "system",
          content: this.getSuggestionPrompt(env, conversation),
        }),
        new ChatMessage({
          role: "user",
          content: `Please suggest more questions or links, and answer in ${this.language}`,
        }),
      ],
      stream: false,
      useMultimodal: false,
      useReasoningModel: true,
      responseType: "json_object",
    });
    if (result.type === "message") {
      return JSON.parse(result.message) as Suggestions;
    }
    throw new Error("Invalid suggestion response");
  }

  private getReflectionPrompt(): string {
    return `## Task
Think whether the current result meet the goals, return the action if not.
- Consider the current goal of user?

The result have 2 types:
1. If the answer is good enough, then return "finished".
2. If need to take actions, then return the function name and arguments.

## Output JSON Format
If the initial answer is meets the user's needs, simply return "finished" without any feedback, like:
\`\`\`json
{
  "evaluation": "finished"
}
\`\`\`
`;
  }

  private getRevisePrompt(feedback: string): string {
    return `## Task
Please revise the last answer based on the feedback, and answer in ${this.language}.
${feedback}

## Output
`;
  }

  private getSuggestionPrompt(
    env: Environment,
    conversation: Conversation,
  ): string {
    const conversationContent = new ConversationJsonSerializer(
      this.contextLength,
    ).toString(conversation);
    const text =
      env.content?.text?.length > 1024 * 5
        ? env.content?.text?.slice(0, 1024 * 5)
        : env.content?.text;

    const currenStatus = env.content
      ? `## Status
The user is browsing webpage:
- Title: ${env.content?.title}
- URL: ${env.content?.url}
- Content: 
${text}
`
      : "";

    return `## Role: Assistant
## Task
Suggest more questions or links he/she can visit. 

${currenStatus}

## Output JSON Format
\`\`\`json
{
  "question": ["search sth. else", "check calendar"],
  "links": [{"title": "Google Calendar", "url":"https://calendar.google.com/"},]
}
\`\`\`

## Conversation Messages
\`\`\`json
${conversationContent}
\`\`\`
`;
  }

  private async getGoalPrompt(
    env: Environment,
    conversation: Conversation,
    tools: ToolDefinition[],
  ): Promise<string> {
    const parameters = {
      userInput: conversation
        .getCurrentInteraction()
        .inputMessage.getContentText(),
      tools: tools.map((t) => t.toJSONString()).join("\n"),
    };

    const template = new PromptTemplate({
      name: "Think",
      template: `## Task
Analysis user's goal based on previous messages in this conversation.
And then, give the thoughts of how to achieve the goal step by step.
Consider the previous goals, if the goal is not change, could use previous goals.

## Tools
{{tools}}

## Example

### Output
**Goal**: 学习并整理和数据科学有关的技术方向

**Steps**:
 - [ ] 搜索数据科学有关的资料，关键词：数据科学 热门方向
 - [ ] 打开搜索结果，保存到临时剪切板
 - [ ] 整理并回答用户问题

### Output Format
Keep the output goal short and precise, just one sentence, less than 50 words. 
Note: user language is {{language}}

## Current User Input
{{userInput}}

### Output
`,
      class: getClassName(this),
      allowEmptyTemplate: false,
      parameters: [
        { name: "currenStatus" },
        { name: "language" },
        { name: "conversationContent" },
        { name: "userInput" },
        { name: "tools" },
      ],
    });
    this.templateEngine.add(template);
    return this.templateEngine.render(template.id, parameters);
  }
}

export default PromptChainOfThoughtService;
