/**
 * Research skill - web_search and open_url_and_get_content tools.
 * Enables the agent to search the web, open pages, extract content, and synthesize.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ddg_search } from "@src/shared/utils/duckduckgo";
import {
  openUrlAndGetContent,
  type TabPageContent,
} from "@src/shared/utils/tabContent";
import type { Skill } from "./types";

const MAX_CONTENT_LENGTH = 80 * 1024;
const MAX_PAGES_PER_SESSION = 8;

let pagesOpenedThisSession = 0;

function truncateText(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "\n\n... [truncated]" : text;
}

function formatPageContent(content: TabPageContent): string {
  return JSON.stringify(
    {
      url: content.url,
      title: content.title,
      text: truncateText(content.text, MAX_CONTENT_LENGTH),
      links: content.links?.slice(0, 30) ?? [],
    },
    null,
    2,
  );
}

export const researchSkill: Skill = {
  id: "research",
  name: "Research",
  description: "Search the web and open pages to extract content for deep research.",

  getTools() {
    return [
      tool(
        async ({ query }: { query: string }) => {
          try {
            const result = await ddg_search(query);
            if ("message" in result) {
              return `Search failed: ${result.message}`;
            }
            return JSON.stringify(result, null, 2);
          } catch (err) {
            return `Search error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
        {
          name: "web_search",
          description:
            "Search the web using DuckDuckGo. Returns search results with titles, URLs, and abstracts. Use this to find relevant pages for the user's research question.",
          schema: z.object({
            query: z.string().describe("The search query"),
          }),
        },
      ),

      tool(
        async ({ url }: { url: string }) => {
          if (pagesOpenedThisSession >= MAX_PAGES_PER_SESSION) {
            return `Page limit reached (${MAX_PAGES_PER_SESSION} pages). Summarize from the sources you already have.`;
          }
          pagesOpenedThisSession++;

          const result = await openUrlAndGetContent(url, {
            active: false,
            closeAfterRead: true,
          });
          if (typeof result === "string") {
            return result;
          }
          return formatPageContent(result);
        },
        {
          name: "open_url_and_get_content",
          description:
            "Open a URL in a browser tab, extract the page content (title, text, links), then close the tab. Use this after web_search to read the full content of a promising search result. Returns the page content or an error message.",
          schema: z.object({
            url: z.string().describe("The URL to open and extract content from"),
          }),
        },
      ),
    ];
  },
};

/**
 * Reset the per-session page counter (call when starting a new research session).
 */
export function resetResearchSession(): void {
  pagesOpenedThisSession = 0;
}
