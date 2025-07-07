import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import { get_content } from "@src/shared/utils";
import { ddg_search } from "@src/shared/utils/duckduckgo";
import { stringToAsyncIterator } from "@src/shared/utils/streaming";
import Thought from "@src/shared/agents/core/Thought";
import intl from "react-intl-universal";
import Environment from "@src/shared/agents/core/Environment";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import { Tool } from "@src/shared/agents/decorators/tool";
import _ from "lodash";

class GoogleAgent extends ThoughtAgent {
  private readonly pages = {
    "search engine": "https://www.google.com",
    calendar: "https://calendar.google.com/",
    "cloud drive": "https://drive.google.com/",
    news: "https://www.toutiao.com/",
  };

  constructor(props: ThoughtAgentProps) {
    super({
      ...props,
      name: "Seeker",
      description: intl
        .get("agent_description_seeker")
        .d("Seeker, your search assistant"),
    });
    this.getTools()
      .find((t) => t.name === "visit")
      .setEnumParameter("website", Object.keys(this.pages));
  }

  @Tool({
    description:
      "search content from duckduckgo api, this will not open duckduckgo webpage. if you want get direct answer, use this tool.",
    required: ["userInput"],
    properties: { userInput: { type: "string" } },
  })
  async search(userInput: string): Promise<any> {
    return await ddg_search(userInput);
  }

  async handleCannotGetGoogleResultError(userInput): Promise<Thought> {
    const prompt = `You're Chrome extension, you can help users to browse google.
You can understand user's questions, open the google to search content, and most important, you can answer user's question based on search results
There is a problem that you cannot get any information from current tab, it's possible because the you're detached from the webpage.
`;
    return await this.chatCompletion({
      messages: [
        new ChatMessage({ role: "system", content: prompt }),
        new ChatMessage({
          role: "user",
          content: `Directly answer question in ${this.language}: "${userInput}"`,
        }),
      ],
    });
  }

  private urlIsOpened = "Url is opened.";

  @Tool({
    description:
      "When user input an url or if user intent to open an url in conversation messages, open given url in browser.",
    required: ["url"],
    properties: { url: { type: "string" } },
  })
  async open_url(url: string): Promise<Thought> {
    return new Promise<any>((resolve, reject) => {
      if (!url) {
        resolve(
          new Thought({
            type: "stream",
            stream: stringToAsyncIterator("Url is required."),
          }),
        );
      }
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          for (const tab of tabs) {
            if (!!tab.url && tab.url.includes(url)) {
              chrome.tabs.update(tab.id, { selected: true, url: url });
              resolve(
                new Thought({
                  type: "stream",
                  stream: stringToAsyncIterator(this.urlIsOpened),
                }),
              );
              return;
            }
          }
        }
        chrome.tabs.create({ url: url });
        resolve(
          new Thought({
            type: "stream",
            stream: stringToAsyncIterator(this.urlIsOpened),
          }),
        );
      });
    });
  }

  @Tool({
    description:
      "When user want to visit some website (search engine, calendar, cloud drive, news, etc.), \n" +
      "open the website or open the given url. the website type or url is required.",
    required: ["website", "url", "userInput"],
    properties: {
      website: { type: "string" },
      url: { type: "string" },
      userInput: { type: "string" },
    },
  })
  async visit(
    website: string,
    url: string,
    userInput: string,
  ): Promise<Thought> {
    const defaultUserInput = `please describe what is this webpage in ${this.language}`;
    userInput = _.isEmpty(userInput) ? defaultUserInput : userInput;
    let result: Thought = null;

    if (!_.isEmpty(url)) {
      result = await this.open_url(url);
    } else if (!_.isEmpty(website)) {
      url = this.pages[website];
      if (!url) {
        throw new Error("Unknown website.");
      }
      result = await this.open_url(url);
    }

    if (result) {
      const status = await result.getMessage();
      if (status === this.urlIsOpened) {
        const env = await this.environment();
        return await this.chatCompletion({
          messages: [
            new ChatMessage({
              role: "system",
              content: await env.systemPrompt(),
            }),
            new ChatMessage({ role: "user", content: userInput }),
          ],
        });
      }
      return new Thought({ type: "message", message: status });
    }

    return new Thought({
      type: "error",
      error: new Error(
        `Invalid visit action: ${website}, ${url}, ${userInput}`,
      ),
    });
  }

  @Tool({
    description: "when user want to visit google to get information.",
    required: ["userInput"],
    properties: { userInput: { type: "string" } },
  })
  async google(userInput: string): Promise<Thought> {
    const goal = this.getConversation().getCurrentInteraction().getGoal();
    const url = await this.openGoogle(userInput);
    const content = await this.get_google_result(url, userInput);
    if (!content) return this.handleCannotGetGoogleResultError(userInput);

    const prompt = `## Role & Task
You're Chrome extension, you can help users to browse google.
You can understand user's questions, open the google to search content, and most important, you can answer user's question based on search results
This is user input:${userInput}
Tell user you helped them to navigate to ${url}, if user input is empty, just open the google webpage.
please summarize this page in ${this.language}, and recommend links or new search query

## Web Page Content
The search results page information are:
- url: ${content.url}
- title: ${content.title}
- text: ${content.text}
The links are: ${JSON.stringify(content.links)}

## User Intent
${goal}
`;

    return await this.chatCompletion({
      messages: [new ChatMessage({ role: "user", content: prompt })],
    });
  }

  private openGoogle(userInput: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const url = `https://www.google.com/search?q=${userInput}`;
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          for (const tab of tabs) {
            if (!!tab.url && tab.url.includes("https://www.google.com")) {
              chrome.tabs.update(tab.id, { selected: true, url: url });
              resolve(url);
              return;
            }
          }
        }
        chrome.tabs.create({ url: url });
        resolve(url);
      });
    });
  }

  private async get_google_result(url, userInput): Promise<any> {
    let count = 0;
    return new Promise<any>(function (resolve, reject) {
      function get_search_result(resolve) {
        count += 1;
        setTimeout(() => {
          get_content().then((response) => {
            if (response && response.title.includes(userInput)) {
              resolve(response);
            } else {
              if (count < 5) {
                get_search_result(resolve);
              } else {
                resolve(response);
              }
            }
          });
        }, 1000);
      }

      get_search_result(resolve);
    });
  }

  /**
   * Describe the current environment
   * @returns {Environment} Environment description
   */
  async environment(): Promise<Environment> {
    const content = await get_content();
    const maxContentLength = 100 * 1024;
    if (content) {
      const textContent =
        content.text.length > maxContentLength
          ? content.text.slice(0, maxContentLength)
          : content.text;
      return {
        systemPrompt: async () => `${this.getInitialSystemMessage()}

## Situation
Current user is viewing the page: ${content.title}, the url is ${content.url}, the content is:
${textContent}.
The links are: ${JSON.stringify(content.links)}`,
      };
    } else {
      return { systemPrompt: async () => this.getInitialSystemMessage() };
    }
  }

  getInitialSystemMessage(): string {
    return `## Role
As an assistant or chrome copilot named ${this.getName()}.
You're good at search and extract information, and also summarize insights from search results.

## Instructions
Please decide to call different tools or directly answer questions in ${this.language}.

### Output
Use markdown format, and use mermaid format for diagram generation.
Consider the language of user input, should not add assistant in answer.

## Action Examples
Situation: User types some keywords.
User input: CNN GNN
Intent: Open the google to search content.
Action: google 

Situation: User asks a question.
User input: What is the history of France?
Intent: Search the content from duckduckgo api, and summarize the history of France.
Action: search
`;
  }
}

export default GoogleAgent;
