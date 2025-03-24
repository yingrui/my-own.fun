import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import Thought from "@src/shared/agents/core/Thought";
import ChatMessage from "@src/shared/agents/core/ChatMessage";

class ElevatorPitchAgent extends ThoughtAgent {
  constructor(props: ThoughtAgentProps) {
    super(props, "myFun", "I am good at write an elevator pitch.");
  }

  async elevatorPitch(
    args: object,
    messages: ChatMessage[] = [],
  ): Promise<Thought> {
    const userInput = args["userInput"] ?? "";
    const feedback = args["feedback"] ?? "";
    const productDetails = args["productDetails"] ?? "";
    const interview = args["interview"] ?? "";
    const elevatorPitch = args["elevatorPitch"] ?? "";

    const prompt = `## Role
You're solution architect, you're designing a product, and you're thinking the product elevator pitch.

## Elevator Pitch format
* For: target customer
* Who: statement of the need, pain point or opportunity
* The: product name
* Is a: what kind of product type (platform? tool?)
* That: key benefit, compelling reason to use
* Unlike: primary competitive alternative
* Our product: statement of primary differentiation

### JSON Format
\`\`\`json
{
  "customer": "target customer",
  "problem": "statement of the need, pain point or opportunity",
  "productName": "product name",
  "productType": "what kind of product type (platform? tool?)",
  "functionality": "key benefit, compelling reason to use",
  "competitors": "primary competitive alternative",
  "differentiation": "statement of primary differentiation"
}
\`\`\`

## More Instructions or Details about Product
${productDetails}

## Interview from other pages
${interview}

## Previous Elevator Pitch
${elevatorPitch}

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
            `please generate product elevator pitch in ${this.language}:`,
        }),
      ],
      stream: true,
      responseType: "json_object",
    });
  }
}

export default ElevatorPitchAgent;
