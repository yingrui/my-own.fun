import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import Thought from "@src/shared/agents/core/Thought";
import ChatMessage from "@src/shared/agents/core/ChatMessage";

class TechArchitectAgent extends ThoughtAgent {
  constructor(props: ThoughtAgentProps) {
    super(
      props,
      "myFun",
      "I am good at draw system technical architecture diagram",
    );
  }

  async drawTechArchitecture(userInput: string): Promise<Thought> {
    const prompt = `## Role
You're system architect, you're helping people to design a system technical architecture based on the context information and requirements provided by the user.

## format
Generate Markdown format output, must use Mermaid to describe system architecture.

### Output example, markdown with mermaid code block
\`\`\`mermaid
flowchart LR
      A[Start]-->B[Do you have coffee beans?]
      B-->|Yes|C[Grind the coffee beans]
      B-->|No|D[Buy ground coffee beans]
      C-->E[Add coffee grounds to filter]
      D-->E
      E-->F[Add hot water to filter]
      F-->G[Enjoy!]
\`\`\`

## Use Language
${this.language}
`;
    return await this.chatCompletion({
      messages: [
        new ChatMessage({ role: "system", content: prompt }),
        new ChatMessage({
          role: "user",
          content: userInput,
        }),
      ],
      stream: false,
    });
  }
}

export default TechArchitectAgent;
