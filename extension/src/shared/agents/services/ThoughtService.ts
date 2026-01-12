import ChatMessage from "../core/ChatMessage";
import Conversation from "../core/Conversation";
import Environment from "../core/Environment";
import Thought from "../core/Thought";
import ToolDefinition from "../core/ToolDefinition";

interface PlanResult {
  goal: string; // The goal of the interaction
  steps: string[]; // The plan steps
  reasoning?: string; // The reasoning message returned by the model
  content: string; // The content message returned by the model
  result: string; // The whole message returned by the model
}

interface ThoughtService {
  /**
   * Analysis user's goal
   * @param env
   * @param conversation
   * @returns {Promise<string>}
   */
  goal(
    env: Environment,
    conversation: Conversation,
    contextMessages: ChatMessage[],
    tools: ToolDefinition[],
  ): Promise<Thought>;
}

export default ThoughtService;
export { PlanResult };
