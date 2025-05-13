import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import CompositeAgent from "@src/shared/agents/CompositeAgent";

import { get_content } from "@src/shared/utils";
import Thought from "@src/shared/agents/core/Thought";
import Environment from "@src/shared/agents/core/Environment";
import ChatMessage, {
  imageContent,
  textContent,
} from "@src/shared/agents/core/ChatMessage";
import { Tool } from "@src/shared/agents/decorators/tool";
import _ from "lodash";

/**
 * myFun Copilot
 * @extends {CompositeAgent} - Agent with tools
 */
class MyFunCopilot extends CompositeAgent {
  constructor(
    props: ThoughtAgentProps,
    name: string,
    description: string,
    agents: ThoughtAgent[] = [],
  ) {
    super(props, name, description, agents);
  }

  private async handleCannotGetContentError(): Promise<Thought> {
    const prompt = `You're an assistant or chrome copilot.
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
      "Based on current web page content, answer user's question or follow the user instruction to generate content for them.",
    required: ["userInput"],
    properties: { userInput: { type: "string" } },
  })
  async summary(userInput: string): Promise<Thought> {
    const content = await get_content();
    if (!content) return this.handleCannotGetContentError();

    const maxContentLength = 100 * 1024;
    const text =
      content.text.length > maxContentLength
        ? content.text.slice(0, maxContentLength)
        : content.text;

    const template = this.promptTemplate(
      "Summary",
      `You're an assistant and good at summarization,
Please summarize the content in: {{language}}, and consider the language of user input.
The output should be short & clear, and in markdown format, if it need be diagram, please use mermaid format.
The user is reading an article: {{title}}.
The content text is: {{text}}
The links are: {{links}}`,
      [
        { name: "language" },
        { name: "title" },
        { name: "text" },
        { name: "links" },
      ],
    );

    const prompt = await this.renderPrompt(template.id, {
      language: this.language,
      title: content.title,
      text: text,
      links: JSON.stringify(content.links),
    });

    userInput = _.isEmpty(userInput)
      ? `please summary the content in ${this.language}`
      : userInput;
    const screenshot = this.getCurrentEnvironment().screenshot;
    const replaceUserInput = this.enableMultimodal
      ? imageContent(userInput, screenshot)
      : textContent(userInput);
    return await this.chatCompletion({
      messages: this.getConversation().getMessages(),
      systemPrompt: prompt,
      userInput: replaceUserInput,
      stream: true,
    });
  }

  /**
   * Generate text content for user
   * @param {string} userInput - User input
   * @param {string} text - Text in editing area
   * @param {number} selectionStart - Start position of selection
   * @param {number} selectionEnd - End position of selection
   * @returns {Promise<any>} ChatCompletion
   */
  @Tool({
    description: "Automatically generate content for user.",
    properties: {
      userInput: { type: "string" },
      text: { type: "string" },
      selectionStart: { type: "number" },
      selectionEnd: { type: "number" },
    },
  })
  async autocomplete(
    userInput: string,
    text: string,
    selectionStart: number,
    selectionEnd: number,
  ): Promise<Thought> {
    const content = await get_content();
    let prompt = "";
    if (text && selectionStart && selectionEnd) {
      prompt = this.autocompletePrompt(
        content,
        text,
        selectionStart,
        selectionEnd,
      );
    } else {
      prompt = `## Role & Task
You're a great editor. You're viewing a webpage and writing something.  
Consider the context, you can try to add 1 sentence to the end of given text.

## Context

### Webpage content
${content.text}

### Text in editing area
${text}

## Output Instruction
Directly give the sentence continue to the end of given text. Do not repeat the content before and after caret position.`;
    }
    return await this.chatCompletion({
      messages: [
        new ChatMessage({ role: "system", content: prompt }),
        new ChatMessage({
          role: "user",
          content: _.isEmpty(userInput)
            ? `Continue writing in ${this.language}:`
            : userInput,
        }),
      ],
    });
  }

  private autocompletePrompt(
    content: any,
    text: string,
    selectionStart: number,
    selectionEnd: number,
  ): string {
    const firstPart = text.slice(0, selectionStart);
    const secondPart = text.slice(selectionEnd);
    const prompt = `## Role
You're a great editor. 
Consider the context, you can try to add 1 sentence to current caret position of document.

## Context

### Webpage content
${content.text}

### Text in editing area

#### Before Caret Position
${firstPart}

#### After Caret Position
${secondPart}

## Output Instruction
Directly give the sentence with markdown format, so AI assistant can directly add to caret position.
Do not repeat the content before and after caret position.
`;
    return prompt;
  }

  /**
   * Describe the current environment
   * @returns {Environment} Environment description
   */
  async environment(): Promise<Environment> {
    const screenshot = this.enableMultimodal
      ? await this.getScreenshot()
      : undefined;
    const content = await get_content();
    const maxContentLength = 100 * 1024;
    if (content) {
      const text =
        content.text.length > maxContentLength
          ? content.text.slice(0, maxContentLength)
          : content.text;
      return {
        systemPrompt: async () => `## Role
As a web browser assistant or chrome copilot, named ${this.getName()}.
You're good at data extraction, data analysis, summarization, wikipedia, and many kinds of internet tools or websites.

## Context

### Viewing Webpage
URL: ${content.url}
Title: ${content.title}

Content:
${text}.

Links: 
${JSON.stringify(content.links)}

# User Intent & How to Help User
${this.getCurrentInteraction().getGoal()}

## Output Instruction
First, please think about the user's intent.
Second, decide to call different tools, and if the tool parameter userInput is empty, please think about the user's goal as userInput. 
If there is no suitable tool to call, please think about the user's goal and directly give the answer. 
Generate answer in ${this.language}, and consider the language of user input.

### Output format
Output format should be in markdown format, and use mermaid format for diagram generation.
`,
        content,
        screenshot,
      };
    } else {
      return {
        systemPrompt: async () => this.getInitialSystemMessage(),
        content,
        screenshot,
      };
    }
  }

  private async getScreenshot(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      chrome.tabs.captureVisibleTab(null, (dataUrl) => {
        resolve(dataUrl);
      });
    });
  }

  getInitialSystemMessage(): string {
    return `As an assistant or chrome copilot.
You can decide to call different tools or directly answer questions in ${this.language}, should not add assistant in answer.
Output format should be in markdown format, and use mermaid format for diagram generation.`;
  }
}

export default MyFunCopilot;
