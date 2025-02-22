import Thought from "../core/Thought";
import Conversation from "../core/Conversation";
import Environment from "../core/Environment";
import Tool from "../core/Tool";

class EvaluationScore {
  evaluation: "finished" | "suggest"; // Mandatory, finished means good enough, suggest means need improvement
  feedback: string; // When evaluation is bad, feedback is required
}

class Suggestions {
  questions: string[];
  links: string[]; // Links to visit
}

interface ReflectionService {
  /**
   * Reflection
   * @param {Environment} env - Environment
   * @param {Conversation} conversation - Conversation
   * @returns {Promise<Thought>} Actions
   */
  reflection(
    env: Environment,
    conversation: Conversation,
    tools: Tool[],
  ): Promise<Thought>;

  /**
   * Revise current output message
   * @param env
   * @param conversation
   * @param evaluation
   * @returns {Promise<Thought>}
   */
  revise(
    env: Environment,
    conversation: Conversation,
    evaluation: EvaluationScore,
  ): Promise<Thought>;

  /**
   * Suggest
   * @param env
   * @param conversation
   * @returns {Promise<Suggestions>}
   */
  suggest(env: Environment, conversation: Conversation): Promise<Suggestions>;
}

export default ReflectionService;
export { EvaluationScore, Suggestions };
