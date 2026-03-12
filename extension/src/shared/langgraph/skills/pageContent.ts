/**
 * Page content skill - provides get_page_content tool.
 * Uses get_content from content script to fetch current tab's text, title, links.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { get_content } from "@src/shared/utils";

async function getPageContent(): Promise<string> {
  const content = await get_content();
  if (!content) {
    return "Could not get page content. The user may need to refresh the page or the extension may be detached from the webpage.";
  }
  const maxLength = 100 * 1024;
  const text =
    content.text.length > maxLength
      ? `${content.text.slice(0, maxLength)}\n\n... [truncated]`
      : content.text;
  return JSON.stringify(
    { url: content.url, title: content.title, text, links: content.links },
    null,
    2,
  );
}

export const pageContentSkill = {
  id: "page_content",
  name: "Page Content",
  description: "Get the current webpage's URL, title, text content, and links.",

  getTools() {
    return [
      tool(
        async () => getPageContent(),
        {
          name: "get_page_content",
          description:
            "Get the text content, title, URL, and links of the currently viewed webpage. Use this when the user asks about the page, wants a summary, or needs information from the page.",
          schema: z.object({}),
        },
      ),
    ];
  },
};
