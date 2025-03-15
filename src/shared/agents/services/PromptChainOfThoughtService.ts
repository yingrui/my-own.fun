import ChatMessage from "../core/ChatMessage";
import ReflectionService, {
  EvaluationScore,
  Suggestions,
} from "./ReflectionService";
import Thought from "../core/Thought";
import ModelService from "./ModelService";
import Environment from "../core/Environment";
import Conversation from "../core/Conversation";
import Tool from "../core/Tool";
import ThoughtService from "@src/shared/agents/services/ThoughtService";

class PromptChainOfThoughtService implements ReflectionService, ThoughtService {
  private readonly modelService: ModelService;
  private readonly language: string;
  private enableChainOfThoughts: boolean;

  constructor(
    modelService: ModelService,
    language: string,
    enableChainOfThoughts: boolean,
  ) {
    this.modelService = modelService;
    this.language = language;
    this.enableChainOfThoughts = enableChainOfThoughts;
  }

  async goal(
    env: Environment,
    conversation: Conversation,
    notifyMessageChanged: (msg: string) => void = undefined,
  ): Promise<string> {
    const thought = await this.modelService.chatCompletion(
      [
        new ChatMessage({
          role: "user",
          content: this.getGoalPrompt(env, conversation),
        }),
      ],
      true,
      false,
      true,
      "text",
    );
    return thought.getMessage(notifyMessageChanged);
  }

  async reflection(
    env: Environment,
    conversation: Conversation,
    tools: Tool[],
  ): Promise<Thought> {
    const result = await this.reviewConversation(tools, env, conversation);

    if (result.type === "message") {
      try {
        const score = JSON.parse(result.message) as EvaluationScore;
        const evaluation: string = score.evaluation || "finished";
        if (evaluation === "finished") {
          // If the answer is good enough, then return the previous message
          return this.previousMessage(conversation);
        }
        if (evaluation === "suggest") {
          return await this.revise(env, conversation, score);
        }
      } catch (e) {
        return new Thought({
          type: "error",
          error: new Error("Invalid JSON format"),
        });
      }
    } else if (result.type === "actions") {
      return result;
    }
    // If the result is not message or actions, then return the previous message
    return this.previousMessage(conversation);
  }

  private previousMessage(conversation: Conversation) {
    const currentInteraction = conversation.getCurrentInteraction();
    const previousMessage = currentInteraction.outputMessage.getContentText();
    return new Thought({ type: "message", message: previousMessage });
  }

  private async reviewConversation(
    tools: Tool[],
    env: Environment,
    conversation: Conversation,
  ) {
    const toolCalls = tools.map((t) => t.getFunction());
    const result = await this.modelService.toolsCall(
      [
        new ChatMessage({
          role: "system",
          content: this.getReflectionPrompt(env, conversation),
        }),
        new ChatMessage({
          role: "user",
          content: `Please follow the reflection prompt, and answer in ${this.language}`,
        }),
      ],
      toolCalls,
      false,
      "json_object",
    );
    return result;
  }

  async revise(
    env: Environment,
    conversation: Conversation,
    evaluation: EvaluationScore,
  ): Promise<Thought> {
    const feedback = evaluation.feedback;
    if (feedback) {
      return await this.modelService.chatCompletion(
        [
          new ChatMessage({
            role: "system",
            content: this.getRevisePrompt(env, conversation, feedback),
          }),
          new ChatMessage({
            role: "user",
            content: `Please revise the last answer based on the feedback, and answer in ${this.language}`,
          }),
        ],
        true,
        false,
        false,
        "text",
      );
    }
    return new Thought({
      type: "error",
      error: new Error("Feedback is required"),
    });
  }

  async suggest(
    env: Environment,
    conversation: Conversation,
  ): Promise<Suggestions> {
    const result = await this.modelService.chatCompletion(
      [
        new ChatMessage({
          role: "system",
          content: this.getSuggestionPrompt(env, conversation),
        }),
        new ChatMessage({
          role: "user",
          content: `Please suggest more questions or links, and answer in ${this.language}`,
        }),
      ],
      false,
      false,
      true,
      "json_object",
    );
    if (result.type === "message") {
      return JSON.parse(result.message) as Suggestions;
    }
    throw new Error("Invalid suggestion response");
  }

  private getReflectionPrompt(
    env: Environment,
    conversation: Conversation,
  ): string {
    const conversationContent = conversation.toString();
    const text =
      env.content?.text?.length > 1024 * 5
        ? env.content?.text?.slice(0, 1024 * 5)
        : env.content?.text;
    return `## Role: Assistant
## Task
Think whether the current result meet the goals, return the actions or suggestions if not.
- Consider the current goal of user?
- Check if the answer is correct or satisfied?

It tools call request, the result have 3 types:
1. If the answer is good enough, then return "finished".
2. If the answer need improve, then return "suggest".
3. If need to take actions, then return the function name and arguments.

## Status
The user is browsing webpage:
- Title: ${env.content?.title}
- URL: ${env.content?.url}
- Content: 
${text}

## Output JSON Format
If the initial answer is meets the user's needs, simply return "finished" without any feedback, like:
\`\`\`json
{
  "evaluation": "finished"
}
\`\`\`
if not satisfied, but the answer is still useful, then return:
\`\`\`json
{
  "evaluation": "suggest",
  "feedback": "feedback & suggestion",
}
\`\`\`

## Examples
### Example 1
#### Conversation Messages
user goal: Find the information about the Hinton.
user: When the Hinton won the nobel prize?
assistant: I don't know, I have the knowledge before 2023.
#### Output
Should choose search action to find the answer.

### Example 2
#### Conversation Messages
user goal: Browsing the webpage more quickly.
user: /summary
assistant: the summary is ...
#### Output
{"evaluation": "finished"}

### Example 3
#### Conversation Messages
user goal: chitchat with some math problem.
user: which number is bigger, the 1.11 or 1.2?
assistant: 1.11 is greater than 1.2
#### Output
{"evaluation": "suggest", "feedback": "the 1.11 is not greater than 1.2, please correct it."}

#### Conversation Messages
${conversationContent}

#### Output
`;
  }

  private getRevisePrompt(
    env: Environment,
    conversation: Conversation,
    feedback: string,
  ): string {
    const conversationContent = conversation.toString();
    const text =
      env.content?.text?.length > 1024 * 5
        ? env.content?.text?.slice(0, 1024 * 5)
        : env.content?.text;
    return `## Role: Assistant
## Task
The given answer is not good enough, please revise the last answer based on below feedback: 
${feedback}

### Watch out
- You don't need to apologize, just correct the answer.
- The feedback is not provided by the user, it's self-review of AI.

## Status
The user is browsing webpage:
- Title: ${env.content?.title}
- URL: ${env.content?.url}
- Content: 
${text}

## Conversation Messages
${conversationContent}
`;
  }

  private getSuggestionPrompt(
    env: Environment,
    conversation: Conversation,
  ): string {
    const conversationContent = conversation.toString();
    const text =
      env.content?.text?.length > 1024 * 5
        ? env.content?.text?.slice(0, 1024 * 5)
        : env.content?.text;
    return `## Role: Assistant
## Task
Suggest more questions or links he/she can visit. 

## Output JSON Format
\`\`\`json
{
  "question": ["search sth. else", "check calendar"],
  "links": [{"title": "Google Calendar", "url":"https://calendar.google.com/"},]
}
\`\`\`

## Status
The user is browsing webpage:
- Title: ${env.content?.title}
- URL: ${env.content?.url}
- Links: ${env.content?.links}
- Content: 
${text}

## Conversation Messages
${conversationContent}
`;
  }

  private getGoalPrompt(env: Environment, conversation: Conversation): string {
    const conversationContent = conversation.toString();
    const text =
      env.content?.text?.length > 1024 * 5
        ? env.content?.text?.slice(0, 1024 * 5)
        : env.content?.text;

    const currenStatus = env.content
      ? `## Status
The user is browsing webpage:
- Title: ${env.content?.title}
- URL: ${env.content?.url}
- Content: 
${text}
`
      : "";

    return `## Role: Assistant
## Task
Analysis user's goal, consider the previous goals, if the goal is not change, could use previous goals.
${this.enableChainOfThoughts ? "And then, give the thoughts of how to achieve the goal step by step." : ""}

## Output Format
Keep the output goal short and precise, just one sentence, less than 50 words. 

Note: user language is ${this.language}

${currenStatus}

## Conversation Messages
${conversationContent}
`;
  }
}

export default PromptChainOfThoughtService;
