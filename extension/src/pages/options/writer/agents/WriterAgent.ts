import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import WriterContext from "@src/pages/options/writer/context/WriterContext";
import Environment from "@src/shared/agents/core/Environment";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import Thought from "@src/shared/agents/core/Thought";
import { Tool } from "@src/shared/agents/decorators/tool";

class WriterAgent extends ThoughtAgent {
  context: WriterContext;

  constructor(props: ThoughtAgentProps, context: WriterContext) {
    super({
      ...props,
      name: "myFun",
      description: "I am good at write an article.",
    });
    this.context = context;
  }

  @Tool({
    description: "help user to create or modify the outline for the article.",
    required: ["userInput"],
    properties: { userInput: { type: "string" } },
  })
  async outline(userInput: string): Promise<Thought> {
    const title = this.context.getTitle();
    const content = this.context.getContent();
    const outline = this.context.getOutline();
    const prompt = `## Role & Task
You're a great editor. 
Now we need your help to create an outline for the article.

## Context of the Article

### Title
${title}

### Current Outline
${outline}

### Content
${content}

### Language
${this.language}

### User Instruction
${userInput}

## Output Instruction
Please think about the structure of the article and provide an outline in markdown format.
`;
    return await this.chatCompletion({
      messages: [
        new ChatMessage({
          role: "user",
          content: prompt,
        }),
      ],
    });
  }

  @Tool({
    description: "help user to continue writing from the cursor.",
    required: ["userInput"],
    properties: { userInput: { type: "string" } },
  })
  async autocomplete(userInput: string): Promise<Thought> {
    const selectionRange = this.context.getSelectionRange();
    const firstPart = this.context
      .getContent()
      .slice(0, selectionRange.selectionStart);
    const secondPart = this.context
      .getContent()
      .slice(selectionRange.selectionEnd);
    const prompt = `## Role
You're a great editor. 
Consider the context, you can try to add 1 sentence to current caret position of document.

## Context

### Title
${this.context.getTitle()}

### Content

#### Before Caret Position
${firstPart}

#### After Caret Position
${secondPart}

## Output Instruction
Directly give the sentence with markdown format, so AI assistant can directly add to caret position.
Do not repeat the content before and after caret position.

## User Input
${userInput}
`;
    return await this.chatCompletion({
      messages: [
        new ChatMessage({ role: "system", content: prompt }),
        new ChatMessage({
          role: "user",
          content: `please provide better content in ${this.language}:`,
        }),
      ],
    });
  }

  async environment(): Promise<Environment> {
    const screenshot = undefined;
    return new Promise<Environment>((resolve, reject) => {
      const title = this.context.getTitle();
      const content = this.context.getContent();

      if (title) {
        resolve({
          systemPrompt:
            async () => `As an article writer assistant named myFun. Here's how you can help users:

* Title: you can help users with the title of the article.
* Outline: you can help users with the structure of the article.

Please answer questions in ${this.language}.
Current user is working on article
Title: ${title}
Content:
${content}.`,
          screenshot,
        });
      } else {
        resolve({
          systemPrompt: async () =>
            `As an assistant named myFun. You can help users writing with given information.`,
          screenshot,
        });
      }
    });
  }
}

export default WriterAgent;
