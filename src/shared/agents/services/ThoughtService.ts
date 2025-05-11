import Conversation from "../core/Conversation";
import Environment from "../core/Environment";
import ToolDefinition from "../core/ToolDefinition";
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
    tools: ToolDefinition[],
    notifyMessageChanged: (msg: string) => void,
  ): Promise<string>;
}

export default ThoughtService;
