import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import { fromReadableStream } from "@src/shared/utils/streaming";
import Thought from "@src/shared/agents/core/Thought";
import intl from "react-intl-universal";
import ChatMessage from "@src/shared/agents/core/ChatMessage";

class BACopilotAgent extends ThoughtAgent {
  baCopilotKnowledgeApi: string;
  baCopilotApi: string;
  baCopilotTechDescription: string;
  apiKey: string;
  conversationIds = {};

  constructor(
    props: ThoughtAgentProps,
    baCopilotKnowledgeApi: string,
    baCopilotApi: string,
    baCopilotTechDescription: string,
    apiKey: string,
  ) {
    super(
      props,
      "BACopilot",
      intl
        .get("agent_description_ba_copilot")
        .d("BACopilot, your BA assistant"),
    );
    this.addTool(
      "user_story",
      "generate story content for user before they want to create a new card in story board. userInput is interactive message between agent & human.",
      ["userInput"],
    );
    this.addTool(
      "tasking",
      "Help developer to breakdown tasks for story in story card, when user is browsing story card page",
      ["userInput"],
    );
    // this.addTool("createCard", "create card in story board with given title and description", ["title", "desc", "column"]);

    this.baCopilotKnowledgeApi = baCopilotKnowledgeApi;
    this.baCopilotApi = baCopilotApi;
    this.baCopilotTechDescription = baCopilotTechDescription;
    this.apiKey = apiKey;
  }

  private async get_board(): Promise<any> {
    return new Promise<any>(function (resolve, reject) {
      // send message to content script, call resolve() when received response"
      chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "get_story_board" },
          (response) => {
            resolve(response);
          },
        );
      });
    });
  }

  async handleCannotGetBoardError(): Promise<Thought> {
    const prompt = `You're an Business Analyst in Software Engineering Team.
But you cannot get any information. Reply sorry and ask user to open or navigate to story board, so you can get information from board.`;
    return await this.chatCompletion([
      new ChatMessage({ role: "system", content: prompt }),
      new ChatMessage({
        role: "user",
        content: `explain in ${this.language}:`,
      }),
    ]);
  }

  async handleCannotGetCardError(): Promise<Thought> {
    const prompt = `You're an Business Analyst or software engineer in Software Engineering Team.
But you cannot get any card information. Reply sorry and ask user to open or navigate to story board card page, so you can get information of card.`;
    return await this.chatCompletion([
      new ChatMessage({ role: "system", content: prompt }),
      new ChatMessage({
        role: "user",
        content: `explain in ${this.language}:`,
      }),
    ]);
  }

  async generateStoryWithGPTModel(
    board: any,
    userInput: string,
  ): Promise<Thought> {
    let prompt = "";
    if (board.type === "board") {
      const context = board.columns.map((column) => {
        const cards = column.cards.map((card, i) => i + ": " + card.name);
        return `
Column: ${column.name}
Cards: ${cards}
`;
      });
      prompt = `You're an Business Analyst in Software Engineering Team.
You're working on a board on: ${board.title}
Please write a story according to user instruction, and generate story in ${this.language} directly.
Here is user input: ${userInput}
Generate title and story content, and story format should be Given/When/Then,
and follow SMART principle (SMART stands for Specific, Measurable, Achievable, Relevant and Time-bound),
A good user story should be – INVEST (Independent, Negotiable, Valuable, Estimable, Small, Testable).
Use markdown format to beautify output.
You need to consider other Columns & Cards information on board, they are:
${context}`;
    } else if (board.type === "card") {
      prompt = `You're an Business Analyst in Software Engineering Team.
You're working on a story card on: ${board.title}, and the description is: ${board.description}
Please write or complete the story according to user instruction, and generate story in ${this.language} directly.
Here is user input: ${userInput}
The story format should be Given/When/Then, and should include Test Cases as well.
Use markdown format to beautify output.`;
    }

    return await this.chatCompletion([
      new ChatMessage({ role: "system", content: prompt }),
      new ChatMessage({
        role: "user",
        content: `generate story in ${this.language}:`,
      }),
    ]);
  }

  async user_story(args: object, messages: ChatMessage[]): Promise<Thought> {
    const userInput = args["userInput"];
    const board = await this.get_board();
    if (!board) return this.handleCannotGetBoardError();
    if (this.baCopilotApi) {
      return this.generateStoryWithRemoteAgent(board, userInput);
    } else {
      return this.generateStoryWithGPTModel(board, userInput);
    }
  }

  async generateStoryWithRemoteAgent(
    board: any,
    userInput: string,
  ): Promise<Thought> {
    try {
      const conversation = await this.createConversation(board, userInput);
      const conversationId = conversation.id;
      const response = await fetch(
        this.baCopilotApi + "/conversations/" + conversationId + "/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + this.apiKey,
          },
          body: JSON.stringify({ message: userInput }),
        },
      );
      return new Thought({
        type: "stream",
        stream: fromReadableStream(response.body),
      });
    } catch (error) {
      console.error(error);
      return this.generateStoryWithGPTModel(board, userInput);
    }

    return this.generateStoryWithGPTModel(board, userInput);
  }

  private async createConversation(
    board: any,
    userInput: string,
  ): Promise<any> {
    if (this.conversationIds[board.url]) {
      const data = this.conversationIds[board.url];
      return new Promise<any>(function (resolve, reject) {
        resolve(data);
      });
    }

    const payload = {
      variables: [
        {
          name: "title",
          value: board.type === "board" ? userInput : board.title,
        },
        { name: "description", value: board.description ?? "" },
      ],
    };

    const response = await fetch(this.baCopilotApi + "/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (response.status == 200) {
      const jsonResult = await response.json();
      if (jsonResult["status"] === "Success") {
        this.conversationIds[board.url] = jsonResult.data;
        return jsonResult.data;
      } else {
        throw new Error("Failed to create conversation: " + jsonResult.status);
      }
    } else {
      throw new Error("Failed to create conversation: " + response.statusText);
    }
  }

  async tasking(args: object, messages: ChatMessage[]): Promise<Thought> {
    let userInput = args["userInput"];
    if (!userInput || userInput === "") {
      userInput = `breakdown tasks in ${this.language}:`;
    }
    const board = await this.get_board();
    if (!board || board.type !== "card" || !board.title)
      return this.handleCannotGetCardError();
    const searchResult = await this.search(board.description);

    const prompt = `## Role: Software Engineer

## Situation: the user story you're working on
You're working on a story card on: ${board.title}
And the story description is:
${board.description}

## Context: technical description
${this.baCopilotTechDescription}

## Reference: some technical blogs you could refer to
Please follow the search result to breakdown the tasks.
${JSON.stringify(searchResult)}

## Task: breakdown tasks
Please breakdown story to implementation tasks follow the instruction from user: ${userInput}, and focus on where and how to implement the story.

## Output Format
At first, think about how to implement this user story. If there is any question, please ask the user.

Second, use markdown format to output a simple list of tasks.
1. ...
2. ...

At last, use markdown format to output the details of some tasks, including:
* Components need to be added or changed
* Sample Code (if possible)

Output language: ${this.language}`;

    return await this.chatCompletion([
      new ChatMessage({ role: "system", content: prompt }),
      new ChatMessage({
        role: "user",
        content: userInput,
      }),
    ]);
  }

  private async search(cardDescription: string): Promise<any> {
    if (this.baCopilotKnowledgeApi.length <= 0) {
      return { total: 0, items: [] };
    }
    const response = await fetch(this.baCopilotKnowledgeApi, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + this.apiKey,
      },
      body: JSON.stringify({ query: cardDescription }),
    });
    return response.json();
  }
}

export default BACopilotAgent;
