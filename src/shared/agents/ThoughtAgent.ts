import OpenAI from "openai";
import Tool from "./core/Tool";
import Conversation from "./core/Conversation";
import Thought from "./core/Thought";
import Environment from "./core/Environment";
import type { MessageContent } from "./core/ChatMessage";
import ChatMessage from "./core/ChatMessage";
import ModelService from "./services/ModelService";
import ReflectionService from "./services/ReflectionService";
import ConversationRepository from "@src/shared/agents/ConversationRepository";
import Agent from "./core/Agent";
import Interaction from "./core/Interaction";
import TemplateEngine from "@src/shared/agents/services/TemplateEngine";
import Template from "@src/shared/agents/services/Template";
import ThoughtService from "@src/shared/agents/services/ThoughtService";

interface ThoughtAgentProps {
  language: string;
  conversation: Conversation;
  enableMultimodal: boolean;
  enableReflection: boolean;
  enableChainOfThoughts: boolean;
  modelService: ModelService;
  reflectionService?: ReflectionService;
  thoughtService?: ThoughtService;
  templateEngine?: TemplateEngine;
}

class ThoughtAgent implements Agent {
  protected readonly language: string;
  protected readonly enableMultimodal: boolean;
  protected readonly enableReflection: boolean;
  protected readonly enableChainOfThoughts: boolean;
  private readonly tools: Tool[] = [];
  private readonly name: string;
  private readonly description: string;
  private readonly conversation: Conversation;
  private readonly modelService: ModelService;
  private readonly reflectionService: ReflectionService;
  private readonly thoughtService: ThoughtService;
  private receiveStreamMessageListener: (msg: string) => void;
  private repo: ConversationRepository;
  private templateEngine: TemplateEngine;

  constructor(props: ThoughtAgentProps, name: string, description: string) {
    this.language = props.language;
    this.conversation = props.conversation;
    this.modelService = props.modelService;
    this.templateEngine = props.templateEngine;
    this.reflectionService = props.reflectionService;
    this.thoughtService = props.thoughtService;
    this.enableMultimodal = props.enableMultimodal;
    this.enableReflection = props.enableReflection;
    this.enableChainOfThoughts = props.enableChainOfThoughts;
    this.name = name;
    this.description = description;
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
   * @returns {Tool[]} Tools
   */
  getTools(): Tool[] {
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
   *    - If user input as argument is given, set it as user input as argument
   *    eg. when user types "/ask_page xxx", agent should understand the user input (xxx) is the parameter "question"
   * 4. At last add tool to the tools
   * @param {string} name - Name of the tool
   * @param {string} description - Description of the tool
   * @param {string[]} stringParameters - String parameters
   * @returns {void}
   */
  addTool(name: string, description: string, stringParameters: string[]): Tool {
    const tool = new Tool(name, description);
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
    return this.getTools().map((tool) => tool.getFunction());
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
    const result = await this.execute(actions);
    const output = await this.onCompleted(result);
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
    let result: Thought = null;

    let plan = await this.plan();
    do {
      result = await this.process(plan);
      plan = await this.observe(result); // directly return the result if reflection is disabled
    } while (this.enableReflection && plan && plan.type === "actions");

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

    const messages = this.messagesWithNewSystemPrompt();
    return await this.toolsCall(messages, toolCalls, true);
  }

  private async process(thought: Thought): Promise<Thought> {
    if (thought.type === "actions") {
      return await this.execute(await this.check(thought.actions));
    } else if (["message", "stream"].includes(thought.type)) {
      return await this.execute([this.replyAction(thought)]);
    } else if (thought.type === "error") {
      return thought;
    }

    throw new Error("Unknown plan type");
  }

  /**
   * Observes the result of the thought, revise the answer if needed
   * @param result
   * @returns {Promise<Thought>}
   */
  private async observe(result: Thought): Promise<Thought> {
    if (!this.enableReflection || result.type === "error") {
      return result;
    }
    await this.readMessage(result);
    return await this.reflection();
  }

  /**
   * Describe the current environment
   * @returns {Environment} Environment description
   */
  async environment(): Promise<Environment> {
    return new Promise<Environment>((resolve, reject) => {
      resolve({ systemPrompt: () => "" });
    });
  }

  private messagesWithNewSystemPrompt() {
    const env = this.getCurrentEnvironment();
    const systemMessage = new ChatMessage({
      role: "system",
      content: env.systemPrompt(),
    });
    const messages = this.conversation.getMessages();
    return env.systemPrompt()
      ? [systemMessage, ...messages.slice(1)]
      : messages;
  }

  private async guessGoal(interaction: Interaction) {
    if (this.enableChainOfThoughts && this.thoughtService) {
      const goal = await this.thoughtService.goal(
        this.getCurrentEnvironment(),
        this.getConversation(),
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
   * @returns {Action[]} Actions
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
      const env = await this.environment();
      return this.chatCompletion(
        this.conversation.getMessages(),
        env.systemPrompt(),
        args["userInput"],
      );
    }

    if (action === "reply") {
      return args["thought"] as Thought;
    }

    for (const member of this.getMemberOfSelf()) {
      if (member === action && typeof this[member] === "function") {
        // TODO: need to verify if arguments of function are correct
        return this[member].apply(this, [
          args,
          this.conversation.getMessages(),
        ]);
      }
    }

    // If could not find the action by function name,
    // then agent should implement executeAction method.
    return this.executeAction(action, args, this.conversation);
  }

  private getMemberOfSelf(): string[] {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(this));
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
   * @param {ChatMessage[]} messages - Messages
   * @param {string} systemPrompt - System prompt
   * @param {string} replaceUserInput - Replace user input
   * @param {bool} stream - Stream
   * @param {string} responseType - Response type
   * @returns {Promise<Thought>} ThinkResult
   */
  async chatCompletion(
    messages: ChatMessage[],
    systemPrompt: string = "",
    replaceUserInput: string | MessageContent[] = "",
    stream: boolean = true,
    responseType: "text" | "json_object" = "text",
  ): Promise<Thought> {
    if (systemPrompt && messages.length > 0 && messages[0].role === "system") {
      const systemMessage = new ChatMessage({
        role: "system",
        content: systemPrompt,
      });
      messages = [systemMessage, ...messages.slice(1)];
    }

    if (
      replaceUserInput &&
      messages.length > 1 &&
      messages[messages.length - 1].role === "user"
    ) {
      const userMessage = new ChatMessage({
        role: "user",
        content: replaceUserInput,
      });
      messages = [...messages.slice(0, messages.length - 1), userMessage];
    }

    return await this.modelService.chatCompletion(
      messages,
      stream,
      this.enableMultimodal,
      false,
      responseType,
    );
  }

  /**
   * Tools call
   * @param {ChatMessage[]} messages - Messages
   * @param {OpenAI.Chat.Completions.ChatCompletionTool[]} tools - Tools
   * @param {bool} stream - Stream
   * @param {string} responseType - Response type
   * @returns {Promise<any>}
   */
  async toolsCall(
    messages: ChatMessage[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    stream: boolean = false,
    responseType: "text" | "json_object" = "text",
  ): Promise<Thought> {
    return await this.modelService.toolsCall(
      messages,
      tools,
      stream,
      responseType,
    );
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
  ): Template {
    const t = new Template({
      name: name,
      template: template,
      agent: this.getName(),
      parameters: parameters,
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
