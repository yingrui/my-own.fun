import OpenAI from "openai";
import ToolDefinition from "./core/ToolDefinition";
import Conversation from "./core/Conversation";
import Thought from "./core/Thought";
import Environment from "./core/Environment";
import type { MessageContent } from "./core/ChatMessage";
import ChatMessage from "./core/ChatMessage";
import ModelService, {
  ChatCompletionParams,
  ChatCompletionTools,
} from "./services/ModelService";
import ReflectionService from "./services/ReflectionService";
import ConversationRepository from "@src/shared/agents/ConversationRepository";
import Agent from "./core/Agent";
import Interaction from "./core/Interaction";
import TemplateEngine from "@src/shared/agents/services/TemplateEngine";
import PromptTemplate from "@src/shared/agents/services/PromptTemplate";
import ThoughtService from "@src/shared/agents/services/ThoughtService";
import {
  getToolsFromClass,
  invokeTool,
} from "@src/shared/agents/decorators/tool";
import { ToolNotFoundError } from "@src/shared/agents/core/errors/ToolErrors";
import { getClassName } from "@src/shared/utils/reflection";
import _ from "lodash";

interface ThoughtAgentProps {
  language: string;
  conversation: Conversation;
  enableMultimodal: boolean;
  enableReflection: boolean;
  enableChainOfThoughts: boolean;
  contextLength: number;
  modelService: ModelService;
  reflectionService?: ReflectionService;
  thoughtService?: ThoughtService;
  templateEngine?: TemplateEngine;
  name?: string;
  description?: string;
}

class ThoughtAgent implements Agent {
  protected readonly language: string;
  protected readonly enableMultimodal: boolean;
  protected readonly enableReflection: boolean;
  protected readonly enableChainOfThoughts: boolean;
  protected readonly contextLength: number;
  private readonly tools: ToolDefinition[];
  private readonly name: string;
  private readonly description: string;
  private readonly conversation: Conversation;
  private readonly modelService: ModelService;
  private readonly reflectionService: ReflectionService;
  private readonly thoughtService: ThoughtService;
  private receiveStreamMessageListener: (msg: string) => void;
  private repo: ConversationRepository;
  private templateEngine: TemplateEngine;
  private disabledTools: string[] = [];

  constructor(props: ThoughtAgentProps) {
    // Initialize required properties
    Object.assign(this, {
      language: props.language,
      conversation: props.conversation,
      modelService: props.modelService,
      enableMultimodal: props.enableMultimodal,
      enableReflection: props.enableReflection,
      enableChainOfThoughts: props.enableChainOfThoughts,
      contextLength: props.contextLength,
      name: props.name,
      description: props.description,
    });

    // Initialize optional services
    this.templateEngine = props.templateEngine;
    this.reflectionService = props.reflectionService;
    this.thoughtService = props.thoughtService;

    // Initialize tools
    this.tools = this.initializeTools();
  }

  private initializeTools(): ToolDefinition[] {
    return [...getToolsFromClass(this.constructor.prototype)];
  }

  /**
   * Get current environment
   */
  protected getCurrentEnvironment(): Environment {
    return this.getCurrentInteraction().environment;
  }

  protected getCurrentInteraction(): Interaction {
    return this.getConversation().getCurrentInteraction();
  }

  setDisabledTool(tool: string): void {
    if (!this.disabledTools.includes(tool)) {
      this.disabledTools.push(tool);
    }
  }

  /**
   * On start interaction:
   *  1. append user message
   *  2. perception environment
   *
   * There are two ways to call this method:
   *  1. When calling the chat method
   *  2. When calling the executeCommand method
   * @returns {void}
   */
  private async onStartInteraction(message: ChatMessage): Promise<void> {
    this.getConversation().appendMessage(message);
    const interaction = this.getCurrentInteraction();
    // Perception
    interaction.environment = await this.environment();
  }

  /**
   * When the chat (or executeCommand) is completed, then do the following:
   * 1. Get the message from the thought
   * 2. Append the message to the conversation, and then save the conversation
   * 3. Review the conversation, reflect, and then execute the actions
   * @param result
   */
  private async onCompleted(result: Thought): Promise<string> {
    this.getCurrentInteraction().setStatus("Completed", "");

    if (result.type === "error") {
      return result.error.message;
    }

    const message = await result.getMessage();
    this.getConversation().appendMessage(
      new ChatMessage({
        role: "assistant",
        content: message,
        name: this.getName(),
      }),
    );
    await this.record();

    return message;
  }

  /**
   * Read message from thought, save the message to the current interaction and notify the message changed
   * @param thought
   * @returns {Promise<string>}
   * @private
   */
  private async readMessage(thought: Thought): Promise<string> {
    const message = await thought.getMessage((msg) => {
      this.notifyMessageChanged(msg);
    });
    this.getCurrentInteraction().setOutputMessage(
      new ChatMessage({
        role: "assistant",
        content: message,
        name: this.getName(),
      }),
    );
    return message;
  }

  protected notifyMessageChanged(message: string) {
    if (this.receiveStreamMessageListener) {
      this.receiveStreamMessageListener(message);
    }
  }

  onMessageChange(listener: (msg: string) => void): Agent {
    this.receiveStreamMessageListener = listener;
    return this;
  }

  private async record(): Promise<string> {
    if (this.repo) {
      return await this.repo.save(this.getConversation());
    }

    return null;
  }

  public setConversationRepository(
    conversationRepository: ConversationRepository,
  ) {
    this.repo = conversationRepository;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  /**
   * Implement interface method, return tools that the agent can use
   * @returns {ToolDefinition[]} Tools
   */
  getTools(): ToolDefinition[] {
    return this.tools;
  }

  /**
   * Get conversation
   * @returns {Conversation} Conversation
   */
  getConversation(): Conversation {
    return this.conversation;
  }

  /**
   * Add tool
   * 1. Create a new tool with given name and description
   * 2. Add string parameters to the tool
   * 3. Set user input as argument, so agent can understand that user input could be which parameter
   *    - If there are more than one string parameters, and user input as argument is not given, set the first one as user input as argument
   *    - If user input as argument is given, set it as user input as argument.
   *    eg: when user types "/ask_page xxx", agent should understand the user input (xxx) is the parameter "question"
   * 4. At last add tool to the tools
   * @param {string} name - Name of the tool
   * @param {string} description - Description of the tool
   * @param {string[]} stringParameters - String parameters
   * @returns {void}
   */
  addTool(
    name: string,
    description: string,
    stringParameters: string[],
  ): ToolDefinition {
    const tool = new ToolDefinition({ name, description });
    for (const stringParameter of stringParameters) {
      tool.setStringParameter(stringParameter);
    }

    this.getTools().push(tool);
    return tool;
  }

  /**
   * Get tool calls
   * @returns {OpenAI.Chat.Completions.ChatCompletionTool[]} ChatCompletionTools
   */
  getToolCalls(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return this.getTools()
      .filter((t) => !this.disabledTools.includes(t.name))
      .map((tool) => tool.getFunction());
  }

  /**
   * Execute
   * @param {Action[]} actions - Actions
   * @param {ChatMessage} message - Chat message
   * @returns {Promise<Thought>} ChatCompletion
   */
  async executeCommand(
    actions: Action[],
    message: ChatMessage,
  ): Promise<Thought> {
    await this.onStartInteraction(message);
    const result = await this.execute(actions).then((result) =>
      this.postprocess(result),
    );
    const output = await this.onCompleted(
      this.thought(await this.readMessage(result)),
    );
    return this.thought(output);
  }

  /**
   * Choose the tool agent to execute the tool
   * @param {ChatMessage} message - Chat message
   * @returns {Promise<Thought>} ChatCompletion
   * @async
   */
  async chat(message: ChatMessage): Promise<Thought> {
    await this.onStartInteraction(message);
    let result = await this.plan();
    do {
      result = await this.process(result);
      result = await this.observe(result); // directly return the result if reflection is disabled
    } while (this.enableReflection && result?.isAction());

    const output = await this.onCompleted(result);
    return this.thought(output);
  }

  /**
   * Think
   * @returns {Promise<Thought>} ThinkResult
   */
  async plan(): Promise<Thought> {
    const interaction = this.conversation.getCurrentInteraction();
    interaction.setStatus("Planning", `${this.getName()} is thinking...`);
    await this.guessGoal(interaction);

    const toolCalls = this.getToolCalls();
    if (toolCalls.length === 0) {
      // return empty list if there is no tool
      return new Thought({ type: "actions", actions: [] });
    }

    const messages = await this.messagesWithNewSystemPrompt();
    return await this.toolsCall({
      messages: messages,
      tools: toolCalls,
      stream: true,
    });
  }

  private async process(thought: Thought): Promise<Thought> {
    if (thought.type === "actions") {
      return this.check(thought.actions)
        .then((actions) => this.execute(actions))
        .then((result) => this.postprocess(result));
    } else if (["message", "stream"].includes(thought.type)) {
      return this.execute([this.replyAction(thought)]);
    } else if (thought.type === "error") {
      return Promise.resolve(thought);
    }

    throw new Error("Unknown plan type");
  }

  private async postprocess(thought: Thought): Promise<Thought> {
    if (thought.type === "functionReturn") {
      return this.thinkResult(thought);
    }
    return thought;
  }

  /**
   * Observes the result of the thought, revise the answer if needed
   * @param result
   * @returns {Promise<Thought>}
   */
  private async observe(result: Thought): Promise<Thought> {
    if (result.type === "error") {
      return result;
    }
    const message = await this.readMessage(result);
    if (!this.enableReflection) {
      return this.thought(message);
    }
    const thought = await this.reflection();
    if (thought.type === "stream") {
      return this.thought(await this.readMessage(thought));
    }
    return thought;
  }

  private async thinkResult(result: Thought): Promise<Thought> {
    const functionReturn = await result.getMessage();
    const goal = this.getCurrentInteraction().getGoal();
    const prompt = `## Context
Considering the previous conversation, please answer the question based on the context.

## User Intent & Goal
${goal}

## Tools Executed and Function Return
${functionReturn}

## Output
`;
    return await this.chatCompletion({
      messages: [new ChatMessage({ role: "user", content: prompt })],
    });
  }

  /**
   * Describe the current environment
   * @returns {Environment} Environment description
   */
  async environment(): Promise<Environment> {
    return new Promise<Environment>((resolve, reject) => {
      resolve({ systemPrompt: async () => "" });
    });
  }

  private async messagesWithNewSystemPrompt() {
    const env = this.getCurrentEnvironment();
    const systemPrompt = await env.systemPrompt();
    const systemMessage = new ChatMessage({
      role: "system",
      content: systemPrompt,
    });
    const messages = this.conversation.getMessages(this.contextLength);
    if (messages[0].role === "system") {
      return _.isEmpty(systemPrompt)
        ? messages.slice(1)
        : [systemMessage, ...messages.slice(1)];
    }
    return messages;
  }

  private async guessGoal(interaction: Interaction) {
    if (this.enableChainOfThoughts && this.thoughtService) {
      const goal = await this.thoughtService.goal(
        this.getCurrentEnvironment(),
        this.getConversation(),
        this.getTools(),
        (msg) => interaction.setGoal(msg),
      );
      interaction.setGoal(goal);
    }
  }

  /**
   * Reflection
   * @returns {Promise<Thought | null>} Actions
   */
  async reflection(): Promise<Thought | null> {
    if (!this.enableReflection) {
      return null;
    }

    const interaction = this.conversation.getCurrentInteraction();
    interaction.setStatus("Reflecting", `${this.getName()} is reflecting...`);
    this.getCurrentInteraction().environment = await this.environment();

    return await this.reflectionService.reflection(
      this.getCurrentEnvironment(),
      this.conversation,
      this.getTools(),
    );
  }

  /**
   * Should be invoked before actions are executed
   * 1. Check action parameters
   * 2. Track dialogue state
   * 3. Control action flow
   * ...
   * @param {Action[]} actions - Actions
   * @returns {Promise<Action[]>} Actions
   */
  async check(actions: Action[]): Promise<Action[]> {
    const messages = this.conversation.getMessages();
    const interaction = this.conversation.getCurrentInteraction();
    // TODO: Implement tracking dialogue state
    if (actions.length === 0) {
      return [this.chatAction(messages[messages.length - 1].content)];
    }
    // TODO: The connections between intent and actions are missing.
    interaction.setIntent(actions[0].name, actions[0].arguments);
    return actions;
  }

  /**
   * Execute
   * @param {Action[]} actions - Actions
   * @returns {Promise<Thought>} ChatCompletion
   */
  async execute(actions: Action[]): Promise<Thought> {
    const interaction = this.conversation.getCurrentInteraction();
    const actionNameList = actions.map((a) => a.name);
    interaction.setStatus(
      "Executing",
      `${this.getName()} is executing ${actionNameList.join(", ")}...`,
    );
    interaction.setAgentName(this.getName());

    // TODO: support multiple actions in future
    const action = actions[0].name;
    const args = actions[0].arguments;

    if (action === "chat") {
      return await this.generateChatReply(args);
    }

    if (action === "reply") {
      return args["thought"] as Thought;
    }

    try {
      const result = await invokeTool(this, action, args);
      if (result instanceof Thought) {
        return result;
      } else {
        return new Thought({ type: "functionReturn", returnValue: result });
      }
    } catch (error) {
      // ignore ToolNotFoundError
      if (!(error instanceof ToolNotFoundError)) {
        throw error;
      }
    }

    // If there is no action found by function name,
    // then agent should implement executeAction method.
    return this.executeAction(action, args, this.conversation);
  }

  protected async generateChatReply(args: object) {
    const env = await this.environment();
    const systemPrompt = await env.systemPrompt();
    return this.chatCompletion({
      messages: this.getConversation().getMessages(this.contextLength),
      systemPrompt: systemPrompt,
      userInput: args["userInput"],
    });
  }

  /**
   * Execute command
   * @param {string} action - Action
   * @param {object} args - Pojo object as Arguments
   * @param {Conversation} conversation - Conversation
   * @returns {Promise<Thought>} ChatCompletion
   */
  async executeAction(
    action: string,
    args: object,
    conversation: Conversation,
  ): Promise<Thought> {
    throw new Error("Unimplemented action: " + action);
  }

  private replyAction(thought: Thought): Action {
    return { name: "reply", arguments: { thought: thought } } as Action;
  }

  private chatAction(userInput: string | MessageContent[]): Action {
    return { name: "chat", arguments: { userInput: userInput } } as Action;
  }

  /**
   * Chat completion
   * @param {ChatCompletionParams} params - Chat completion params
   * @returns {Promise<Thought>} ThinkResult
   */
  async chatCompletion({
    messages,
    systemPrompt,
    userInput,
    stream,
    responseType,
  }: ChatCompletionParams): Promise<Thought> {
    // useMultimodal and useReasoningModel are controlled by the agent
    return await this.modelService.chatCompletion({
      messages: messages,
      systemPrompt: systemPrompt ?? "",
      userInput: userInput ?? "",
      stream: stream ?? true,
      useMultimodal: this.enableMultimodal,
      useReasoningModel: false,
      responseType: responseType ?? "text",
    });
  }

  /**
   * Tools call
   * @param {ChatCompletionTools} params - Chat completion tools
   * @returns {Promise<any>}
   */
  async toolsCall({
    messages,
    tools,
    stream,
    responseType,
  }: ChatCompletionTools): Promise<Thought> {
    return await this.modelService.toolsCall({
      messages: messages,
      tools: tools ?? [],
      stream: stream ?? false,
      responseType: responseType ?? "text",
    });
  }

  protected thought(message: string) {
    return new Thought({
      model: this.getName(),
      modelType: "agent",
      type: "message",
      message: message,
    });
  }

  protected promptTemplate(
    name: string,
    template: string,
    parameters: any,
    allowEmptyTemplate: boolean = false,
  ): PromptTemplate {
    const t = new PromptTemplate({
      name: name,
      template: template,
      class: getClassName(this),
      parameters: parameters,
      allowEmptyTemplate: allowEmptyTemplate,
    });
    this.templateEngine.add(t);
    return t;
  }

  protected async renderPrompt(
    templateId: string,
    parameters: any,
  ): Promise<string> {
    return this.templateEngine.render(templateId, parameters);
  }
}

export default ThoughtAgent;
export type { ThoughtAgentProps };
