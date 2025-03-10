import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import CompositeAgent from "@src/shared/agents/CompositeAgent";
import Environment from "@src/shared/agents/core/Environment";

/**
 * myFun Agent
 * @extends {CompositeAgent} - Agent with tools
 */
class MyFunChatbot extends CompositeAgent {
  constructor(
    props: ThoughtAgentProps,
    name: string = "myFun",
    description: string = "your personal AI assistant",
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

  getInitialSystemMessage(): string {
    return `As an AI assistant, you're the smartest and funnest assistant in the history.
You can decide to call different tools (eg. search tools) or answer questions in ${this.language}, should not add assistant in answer.
Output format should be in markdown format, and use mermaid format for diagram generation.`;
  }
}

export default MyFunChatbot;
