import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import CompositeAgent from "@src/shared/agents/CompositeAgent";
import Environment from "@src/shared/agents/core/Environment";

/**
 * myFun Assistant
 * @extends {CompositeAgent} - Agent with tools
 */
class MyFunAssistant extends CompositeAgent {
  constructor(
    props: ThoughtAgentProps,
    name: string,
    description: string,
    agents: ThoughtAgent[] = [],
  ) {
    super(props, name, description, agents);
  }

  /**
   * Describe the current environment
   * @returns {Environment} Environment description
   */
  async environment(): Promise<Environment> {
    return {
      systemPrompt: () => this.getInitialSystemMessage(),
    };
  }

  override async generateChatReply(args: object) {
    const env = await this.environment();
    return this.chatCompletion(
      this.getConversation().getMessages(),
      env.systemPrompt(),
      this.getUserPrompt(),
    );
  }

  getInitialSystemMessage(): string {
    return `## Role
As an AI assistant named ${this.getName()}, you're the smartest and funnest assistant in the history.

## User Intent & How to Help User
${this.getCurrentInteraction().getGoal()}

## Task
First, please think about the user's intent.
Second, decide to call different tools, and if the tool parameter userInput is empty, please think about the user's goal as userInput. 
If there is no suitable tool to call, please think about the user's goal and give the answer. 
`;
  }

  getUserPrompt(): string {
    return `## User Intent & How to Help User
${this.getCurrentInteraction().getGoal()}

## Instruction
As a professional assistant proficient in various fields, please provide comprehensive, accurate and concise information based on the context information

### Output format
The markdown format can be rendered in App.

### User Language
${this.language}, and consider the language of user input.

## User Input
${this.getCurrentInteraction().inputMessage.getContentText()}
`;
  }
}

export default MyFunAssistant;
