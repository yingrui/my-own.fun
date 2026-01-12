import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import Thought from "@src/shared/agents/core/Thought";
import ChatMessage from "@src/shared/agents/core/ChatMessage";

class UserJourneyAgent extends ThoughtAgent {
  constructor(props: ThoughtAgentProps) {
    super({
      ...props,
      name: "myFun",
      description: "I am good at user journey",
    });
  }

  async userJourney(
    args: object,
    messages: ChatMessage[] = [],
  ): Promise<Thought> {
    const userInput = args["userInput"] ?? "";
    const feedback = args["feedback"] ?? "";
    const details = args["details"] ?? "";
    const boardContent = args["boardContent"] ?? "";
    const userJourney = args["userJourney"] ?? "";

    const prompt = `## Role
You're solution architect, you're designing a product, and you're designing the user journey now.

## User journey format
Generate Markdown format output, must use Mermaid to describe user journey.

### Output example, markdown with mermaid code block
\`\`\`mermaid
journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me
\`\`\`

## More Instructions or Details about Product
${details}

## Workshop Board Content
${boardContent}

## Previous User Journey
${userJourney}

## User Input, they may provide some feedbacks or requirements
${feedback}
`;
    return await this.chatCompletion({
      messages: [
        new ChatMessage({ role: "system", content: prompt }),
        new ChatMessage({
          role: "user",
          content:
            userInput ??
            `please generate product user journey in ${this.language}:`,
        }),
      ],
      stream: true,
    });
  }
}

export default UserJourneyAgent;
