import OpenAI from "openai";
import Tool from "./Tool";
import ThoughtAgent from "./ThoughtAgent";

/**
 * Agent with tools
 */
abstract class AgentWithTools extends ThoughtAgent {
  language: string;

  constructor(
    defaultModelName: string,
    toolsCallModel: string,
    client: OpenAI,
    language: string,
  ) {
    super(defaultModelName, toolsCallModel, client);
    this.language = language;
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
   * @param {string} userInputAsArgument - User input as argument
   * @returns {void}
   */
  public addTool(
    name: string,
    description: string,
    stringParameters: string[],
    userInputAsArgument: string = null,
  ): void {
    const tool = new Tool(name, description);
    for (const stringParameter of stringParameters) {
      tool.addStringParameter(stringParameter);
    }

    if (stringParameters.length > 0 && userInputAsArgument === null) {
      tool.setUserInputAsArgument(stringParameters[0]);
    } else if (userInputAsArgument) {
      tool.setUserInputAsArgument(userInputAsArgument);
    }
    this.getTools().push(tool);
  }

  /**
   * Execute
   * 1. Execute the tool
   * 2. Parse the tool arguments
   * @param {OpenAI.Chat.Completions.ChatCompletionMessageToolCall} tool - Tool
   * @param {ChatMessage[]} messages - Messages
   * @returns {Promise<any>} ChatCompletion
   * @throws {Error} Unexpected tool call, or error parsing tool arguments
   */
  async execute(
    tool: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
    messages: ChatMessage[],
  ): Promise<any> {
    let args = {};
    try {
      if (tool.function.arguments) {
        args = JSON.parse(tool.function.arguments);
      }
    } catch (e) {
      console.error("Error parsing tool arguments", e);
      console.error("tool.function.arguments", tool.function.arguments);
    }
    return this.executeCommand(tool.function.name, args, messages);
  }

  /**
   * Execute command with user input.
   * The user input should be set to object args, need to figure out which parameter is the user input.
   * @param {string} command - Command
   * @param {string} userInput - User input
   * @param {ChatMessage[]} messages - Messages
   * @returns {Promise<any>} ChatCompletion
   * @throws {Error} Unexpected tool call
   */
  async executeCommandWithUserInput(
    command: string,
    userInput: string,
    messages: ChatMessage[],
  ): Promise<any> {
    const args = {};
    // Find the tool with the given command
    for (const tool of this.tools) {
      if (tool.name === command) {
        // Set the user input as an argument
        args[tool.userInputAsArgument] = userInput;
        break;
      }
    }
    return this.executeCommand(command, args, messages);
  }

  /**
   * Execute command
   * @param {string} command - Command
   * @param {object} args - Pojo object as Arguments
   * @param {ChatMessage[]} messages - Messages
   * @returns {Promise<any>} ChatCompletion
   * @abstract
   */
  abstract executeCommand(
    command: string,
    args: object,
    messages: ChatMessage[],
  ): Promise<any>;

  /**
   * Chat completion
   * @param {ChatMessage[]} messages - Messages
   * @param {bool} stream - Stream
   * @returns {Promise<any>} ChatCompletion
   */
  async chatCompletion(
    messages: ChatMessage[],
    stream: boolean = true,
  ): Promise<any> {
    return await this.client.chat.completions.create({
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      model: this.modelName,
      stream: stream,
      max_tokens: 4096,
    });
  }
}

export default AgentWithTools;
