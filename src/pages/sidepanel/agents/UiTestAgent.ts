import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import { get_html } from "@src/shared/utils";
import Thought from "@src/shared/agents/core/Thought";
import intl from "react-intl-universal";
import ChatMessage, {
  imageContent,
  textContent,
} from "@src/shared/agents/core/ChatMessage";
import { Tool } from "@src/shared/agents/decorators/tool";

class UiTestAgent extends ThoughtAgent {
  constructor(props: ThoughtAgentProps) {
    super({
      ...props,
      name: "QACopilot",
      description: intl
        .get("agent_description_qa_copilot")
        .d("QACopilot, your QA assistant"),
    });
  }

  async handleCannotGetHtmlError(): Promise<Thought> {
    const prompt = `You're an assistant or chrome copilot, named ${this.getName()}.
The user is viewing the page, but you cannot get any information, it's possible because the you're detached from the webpage.
Reply sorry and ask user to refresh webpage, so you can get information from webpage.`;
    return await this.chatCompletion({
      messages: [
        new ChatMessage({ role: "system", content: prompt }),
        new ChatMessage({
          role: "user",
          content: `explain in ${this.language}:`,
        }),
      ],
    });
  }

  @Tool({
    description:
      "understand user's instruct and generate an UI E2E test for current viewing webpage",
    required: ["userInput"],
    properties: { userInput: { type: "string" } },
  })
  async ui_test(userInput: string): Promise<Thought> {
    const page = await get_html();
    if (!page) return this.handleCannotGetHtmlError();

    const html =
      page.html.length > 128 * 1024
        ? page.html.slice(0, 128 * 1024)
        : page.html;

    const prompt = `You're a senior QA engineer and good at cypress e2e test.
The user is viewing webpage: ${page.url} ${page.title}.
Please generate cypress e2e test according to user instruction: ${userInput}
The webpage html is below:
${html}`;

    const screenshot = this.getCurrentEnvironment().screenshot;
    const instruct = "please generate cypress test:";
    const content = this.enableMultimodal
      ? imageContent(instruct, screenshot)
      : textContent(instruct);

    return await this.chatCompletion({
      messages: [
        new ChatMessage({ role: "system", content: prompt }),
        new ChatMessage({ role: "user", content: content }),
      ],
    });
  }
}

export default UiTestAgent;
