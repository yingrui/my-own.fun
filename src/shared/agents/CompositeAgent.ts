import OpenAI from "openai";
import ToolDefinition from "./core/ToolDefinition";
import ThoughtAgent, { ThoughtAgentProps } from "./ThoughtAgent";
import Conversation from "./core/Conversation";
import Thought from "./core/Thought";
import Agent from "./core/Agent";

/**
 * Composite Agent
 * @extends {ThoughtAgent} - Agent with tools
 */
class CompositeAgent extends ThoughtAgent {
  mapToolsAgents = {};
  chatCompletionTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
  subAgents: ThoughtAgent[] = [];

  constructor(
    props: ThoughtAgentProps,
    name: string,
    description: string,
    agents: ThoughtAgent[] = [],
  ) {
    super({
      ...props,
      name,
      description,
    });

    for (const agent of agents) {
      this.addAgent(agent);
    }
  }

  /**
   * Add the agent
   * 1. Add agent tools to the chat completion tools
   * 2. Map the tools agents
   * @constructor
   * @param {ThoughtAgent} agent - Agent
   * @returns {void}
   */
  private addAgent(agent: ThoughtAgent): void {
    this.subAgents.push(agent);
    for (const tool of agent.getTools()) {
      const tools = this.getTools();
      // If the tool is not already in the tools list, add it
      if (!tools.find((t) => t.name === tool.name)) {
        tools.push(tool);
        const toolCall = tool.getFunction();
        this.chatCompletionTools.push(toolCall);
        this.mapToolsAgents[toolCall.function.name] = agent;
      }
    }
  }

  /**
   * Override the addTool function, add the tool to chatCompletionTools and mapToolsAgents
   */
  addTool(
    name: string,
    description: string,
    stringParameters: string[],
  ): ToolDefinition {
    const tool = super.addTool(name, description, stringParameters);
    const toolCall = tool.getFunction();
    this.chatCompletionTools.push(toolCall);
    this.mapToolsAgents[toolCall.function.name] = this;
    return tool;
  }

  /**
   * Implement the executeAction function of ThoughtAgent
   * 1. Find the agent from the mapToolsAgents, and throw an error if not found
   * 2. Hand off the action to the agent
   * @param {string} command - Command
   * @param {object} args - Arguments
   * @param {Conversation} conversation - Conversation
   * @returns {Promise<Thought>} ChatCompletion
   * @async
   * @throws {Error} Unexpected action in CompositeAgent({agent}): {action}
   */
  async executeAction(
    action: string,
    args: object,
    conversation: Conversation,
  ): Promise<Thought> {
    const agent = this.mapToolsAgents[action] as Agent;
    if (agent) {
      return agent.execute([{ name: action, arguments: args }]);
    } else {
      throw new Error(
        `Unexpected action in CompositeAgent(${this.getName()}): ${action}`,
      );
    }
  }
}

export default CompositeAgent;
