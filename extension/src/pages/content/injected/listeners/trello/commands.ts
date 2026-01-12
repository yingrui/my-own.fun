import OpenAI from "openai";
import { matchURL } from "@pages/content/injected/listeners/utils";
import jQuery from "jquery";

class TrelloHelper {
  client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: "", dangerouslyAllowBrowser: true });
  }

  private getBoardTitle(): string {
    const board = jQuery('[data-testid="board-name-display"]');
    return board ? board.text() : document.title;
  }

  private getColumn(column: any): any {
    const name = jQuery(column).find("h2").first().text();
    const cards = jQuery(column)
      .find('a[data-testid="card-name"]')
      .map((id, a) => {
        return { name: jQuery(a).text(), href: jQuery(a).attr("href") };
      })
      .get();

    return { name: name, cards: cards };
  }

  private getBoardCards(): any {
    const columns = jQuery("ol[id='board'] li[data-testid='list-wrapper']");
    return columns
      .map((id, li) => {
        return this.getColumn(li);
      })
      .get();
  }

  private getCardTitle(): string {
    const title = jQuery("#card-back-name");
    return title ? title.text() : document.title;
  }

  private getCardDescription(): string {
    const description = jQuery("div[data-testid='description-content-area']");
    return description ? description.text() : "";
  }

  getCurrentBoard(): any {
    const url = document.URL;
    if (url.startsWith("https://trello.com/b/")) {
      // It is a board page
      const currentBoard = {
        type: "board",
        title: this.getBoardTitle(),
        url: document.URL,
        columns: this.getBoardCards(),
      };
      return currentBoard;
    } else {
      // It is a card page
      const card = {
        type: "card",
        title: this.getCardTitle(),
        url: document.URL,
        description: this.getCardDescription(),
      };
      return card;
    }
  }
}

const addCommands = () => {
  if (matchURL("trello.com")) {
    const helper = new TrelloHelper();

    document.addEventListener("keydown", function (event) {
      if (event.shiftKey && event.altKey && event.key === "Enter") {
        chrome.runtime.sendMessage({
          type: "command_from_content_script",
          command: {
            name: "trello",
            userInput: "generate story content",
            tool: "generate_story",
            args: {
              title:
                "Generate story content for user before they want to create a new card in Trello board",
            },
            url: document.URL,
            date: new Date().toISOString(),
          },
        });
      }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      (async () => {
        if (message.type === "get_story_board") {
          sendResponse(helper.getCurrentBoard());
        }
      })();
    });
  }
};

addCommands();
