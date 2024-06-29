import OpenAI from "openai";
import AgentWithTools from "./AgentWithTools";
import { get_content } from "@pages/sidepanel/utils";

class SummaryAgent extends AgentWithTools {
  constructor(
    defaultModelName: string,
    toolsCallModel: string,
    client: OpenAI,
    language: string,
  ) {
    super(defaultModelName, toolsCallModel, client, language);
    this.addTool(
      "summary",
      "understand user's instruct and generate summary from given content for user",
      ["userInput"],
    );
    this.addTool(
      "ask_page",
      "Based on current web page content, answer user's question or follow the user instruction to generate content for them.",
      ["userInput"],
    );
  }

  async handleCannotGetContentError(): Promise<any> {
    const prompt = `You're an assistant or chrome copilot provided by GluonMeson, Guru Mason is your name.
The user is viewing the page, but you cannot get any information, it's possible because the you're detached from the webpage.
Reply sorry and ask user to refresh webpage, so you can get information from webpage.`;
    return await this.chatCompletion([
      { role: "system", content: prompt },
      { role: "user", content: `explain in ${this.language}:` },
    ]);
  }

  async summary(args: object, messages: ChatMessage[]) {
    const userInput = args["userInput"];
    const content = await get_content();
    if (!content) return this.handleCannotGetContentError();

    const prompt = `You're an assistant and good at summarization,
Please summarize the content in: ${this.language}.
The user is reading an article: ${content.title}.
The content text is: ${content.text}
The links are: ${JSON.stringify(content.links)}`;

    return await this.chatCompletion(
      messages,
      prompt,
      userInput ?? `please summary the content in ${this.language}`,
    );
  }

  async ask_page(args: object, messages: ChatMessage[]) {
    const userInput = args["userInput"];
    const content = await get_content();
    if (!content) return this.handleCannotGetContentError();

    const prompt = `You're an assistant and good at data analysis & collection, summarization, wikipedia, and many kinds of internet tools,
Please answer user's question in ${this.language}.
The user is reading an article: ${content.title}.
The content text is: ${content.text}
The links are: ${JSON.stringify(content.links)}`;

    return await this.chatCompletion(
      messages,
      prompt,
      userInput ?? `please answer in ${this.language}`,
    );
  }
}

export default SummaryAgent;
