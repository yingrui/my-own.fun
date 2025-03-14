import Tool from "./core/Tool";
import Agent from "./core/Agent";
import Conversation from "./core/Conversation";
import Thought from "./core/Thought";
import Environment from "./core/Environment";
import ChatMessage from "./core/ChatMessage";
import ConversationRepository from "./ConversationRepository";
import ThoughtAgent from "./ThoughtAgent";

/**
 * Delegation Agent
 * @extends {DelegateAgent} - Agent with tools
 */
class DelegateAgent implements Agent {
  initAgent: Agent;
  currentAgent: Agent;
  commands: CommandOption[];
  agents: Agent[];
  conversation: Conversation;
  chitchatWhenToolNotFound: boolean;

  constructor(
    agent: Agent,
    agents: Agent[] = [],
    commands: CommandOption[] = [],
    conversation: Conversation = new Conversation(),
    chitchatWhenToolNotFound: boolean = false,
  ) {
    this.initAgent = agent;
    this.currentAgent = agent;
    this.agents = agents;
    this.commands = commands;
    this.conversation = conversation;
    this.chitchatWhenToolNotFound = chitchatWhenToolNotFound;
  }

  onMessageChange(listener: (msg: string) => void): Agent {
    this.currentAgent.onMessageChange(listener);
    for (const agent of this.agents) {
      agent.onMessageChange(listener);
    }
    return this;
  }

  public setConversationRepository(
    conversationRepository: ConversationRepository,
  ) {
    for (const agent of [this.currentAgent, ...this.agents]) {
      if (agent instanceof ThoughtAgent) {
        agent.setConversationRepository(conversationRepository);
      }
    }
  }

  public getName(): string {
    return this.currentAgent.getName();
  }

  public getDescription(): string {
    return this.currentAgent.getDescription();
  }

  public getTools(): Tool[] {
    return this.currentAgent.getTools();
  }

  public getConversation(): Conversation {
    return this.conversation;
  }

  public plan(): Promise<Thought> {
    return this.currentAgent.plan();
  }

  public async reflection(): Promise<Thought | null> {
    return await this.currentAgent.reflection();
  }

  public async executeCommand(
    actions: Action[],
    message: ChatMessage,
  ): Promise<Thought> {
    return this.currentAgent.executeCommand(actions, message);
  }

  public async execute(actions: Action[]): Promise<Thought> {
    return await this.currentAgent.execute(actions);
  }

  public async environment(): Promise<Environment> {
    return await this.currentAgent.environment();
  }

  /**
   * Get the command options
   * Commands are defined in field this.commands, eg.: ask_page, summary, translate, trello, help
   * @returns {object[]} Command options
   */
  public getCommandOptions(): CommandOption[] {
    return [...this.commands]; // clone commands
  }

  public getAgentOptions(): CommandOption[] {
    const options = this.agents
      .filter((agent) => agent != this.currentAgent)
      .map((agent) => ({
        value: agent.getName(),
        label: `@${agent.getDescription()}`,
      }));
    if (this.currentAgent != this.initAgent) {
      options.push({
        value: this.initAgent.getName(),
        label: `@${this.initAgent.getDescription()}`,
      });
    }
    return options;
  }

  /**
   * Execute command with user input.
   * The user input should be set to object args, need to figure out which parameter is the user input.
   * There is a switch to control if chitchat when tool not found.
   * @param {string} command - Command
   * @param {string} userInput - User input
   * @returns {Promise<Thought>} ChatCompletion
   * @throws {Error} Unexpected tool call
   */
  async executeCommandWithUserInput(
    command: string,
    userInput: string = "",
  ): Promise<Thought> {
    const args = {};
    // Find the tool with the given command
    for (const tool of this.getTools()) {
      if (tool.name === command) {
        args["userInput"] = userInput;
        return this.executeCommand(
          [{ name: command, arguments: args }],
          new ChatMessage({
            role: "user",
            content: `/${command} ${userInput}`.trim(),
          }),
        );
      }
    }

    if (this.chitchatWhenToolNotFound) {
      return this.executeCommand(
        [], // Empty action means chitchat by default, also depends on the behavior of the agent
        new ChatMessage({
          role: "user",
          content: `/${command} ${userInput}`.trim(),
        }),
      );
    }

    return new Thought({
      type: "error",
      error: new Error("Unexpected tool call: " + command),
    });
  }

  /**
   * Handle the chat messages
   * 1. Get the last user input from the chat messages
   * 2. Parse the command from the user input
   * 3. If the command is found, execute the command
   * 4. If the command is not found and tools call model is specified, call the tool
   * 5. If the tool call model is not specified, return the chat completion
   * @param {ChatMessage} message - Chat message
   * @returns {Promise<Thought>} ChatCompletion
   * @async
   */
  async chat(message: ChatMessage): Promise<Thought> {
    const [command, agent, userInput] = this.parseCommand(
      message.getContentText(),
    );
    if (agent) {
      this.currentAgent = agent;
    }

    if (this.commands.find((c) => c.value === command)) {
      // TODO: need to consider change commands according to current agent
      this.currentAgent = this.initAgent; // reset to init agent
      return this.executeCommandWithUserInput(command, userInput);
    } else {
      return this.currentAgent.chat(message);
    }
  }

  /**
   * Parse the command from the user input
   * If the user input starts with /{command}, return the command and the user input
   * If the user input does not starts with /{command}, return command ('chat') and the user input
   * @param {string} userInput - input
   * @returns {[string, string]} - Command and user input
   */
  private parseCommand(userInput: string): [string, Agent, string] {
    const matchedCommand = this.commands.find((command) =>
      userInput.match(new RegExp(`(?:^|\\s)/${command.value}\\s+`)),
    );

    const matchedAgent = this.agents.find((agent) =>
      userInput.match(new RegExp(`(?:^|\\s)@${agent.getName()}\\s+`)),
    );

    if (matchedCommand) {
      // Use regex group match to extract the input after the command
      const input = userInput.match(
        new RegExp(`(?:^|\\s)/${matchedCommand.value}\\s+(.*)`),
      )[1];
      return [matchedCommand.value, matchedAgent, input];
    }
    return ["chat", matchedAgent, userInput];
  }
}

export default DelegateAgent;
