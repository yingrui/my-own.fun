import ThoughtAgent from "@src/shared/agents/ThoughtAgent";
import { get_content } from "@src/shared/utils";
import ChatMessage from "@src/shared/agents/core/ChatMessage";

class BrowserCopilot extends ThoughtAgent {
  constructor(props) {
    super(props, "myFun", "I am myFun, let me guess what you want.");
  }

  private async getWebpageContent() {
    const content = await get_content();
    if (!content)
      return "Sorry, I cannot get any information from the webpage.";

    const maxContentLength = 100 * 1024;
    const text =
      content.text.length > maxContentLength
        ? content.text.slice(0, maxContentLength)
        : content.text;
    return text;
  }

  async recommend(args, messages = []) {
    const history = args["history"] ?? "";
    const text = await this.getWebpageContent();

    const prompt = `## Role
You're browser copilot, you know many useful websites and how to get information from them.

### Task
Based on the user's browsing history & current viewing web page, you can help user to find the information they need.

About the instruction, since you are the browser extension, you can do:
- Side panel: open the 'side panel' to ask AI assistant more questions.
- Options page: open the 'options page' to use tools like: AI Search, Writing Assistant, Architect Assistant, etc.

## Context

### Browsing History
${history}

### Current Web Page
${text}

## Output Format
Give your guess first, then provide your suggestion and instructions.
Output should be markdown format. 
`;
    return await this.chatCompletion({
      messages: [
        new ChatMessage({ role: "system", content: prompt }),
        new ChatMessage({
          role: "user",
          content: `Please guess what I need, and give me some suggestion, answer me in ${this.language}:`,
        }),
      ],
    });
  }
}

export default BrowserCopilot;
