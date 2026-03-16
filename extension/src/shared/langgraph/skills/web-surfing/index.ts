/**
 * Web surfing skill - interact with the current page: get layout, click, input, submit, navigate.
 */

import { tool } from "@langchain/core/tools";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";
import {
  getPageLayout,
  getPageContent,
  getOpenTabs,
  clickElement,
  inputText,
  submitForm,
  navigateToUrl,
} from "@src/shared/utils/webSurfing";
import type { Skill } from "../types";
import instructions from "./SKILL.md?raw";

function formatResult(result: { success: boolean; error?: string }): string {
  if (result.success) return "Success.";
  return `Failed: ${result.error ?? "Unknown error"}`;
}

export const webSurfingSkill: Skill = {
  id: "web_surfing",
  name: "Web Surfing",
  description:
    "Interact with the current page: get page layout could return layout and elements, click elements, fill forms, submit, navigate.",
  instructions,

  getTools(): StructuredToolInterface[] {
    return [
      tool(
        async () => {
          const data = await getPageLayout();
          if (!data) return "Could not get page layout. The extension may not be attached to the page.";
          return JSON.stringify(data, null, 2);
        },
        {
          name: "get_page_layout",
          description:
            "Get the current page's layout tree with xpaths for links, inputs, and buttons. Call this first when the user wants to interact with the page.",
          schema: z.object({}),
        },
      ) as StructuredToolInterface,
      tool(
        async ({ tab_id }: { tab_id?: number }) => getPageContent(tab_id),
        {
          name: "get_page_content",
          description:
            "Get the text content, title, URL, and links of a webpage. Use tab_id from get_open_tabs to read a specific tab; omit tab_id for the current active tab. Use when the user asks about a page, wants a summary, or needs information from it.",
          schema: z.object({
            tab_id: z
              .number()
              .optional()
              .describe("Tab ID from get_open_tabs. Omit for the current active tab."),
          }),
        },
      ) as StructuredToolInterface,
      tool(
        async () => {
          const tabs = await getOpenTabs();
          return JSON.stringify(tabs, null, 2);
        },
        {
          name: "get_open_tabs",
          description:
            "List all open tabs in the current window. Returns id, title, and url for each tab. Use tab ids with get_page_content to read content from a specific tab.",
          schema: z.object({}),
        },
      ) as StructuredToolInterface,
      tool(
        async ({ xpath }: { xpath: string }) => {
          const result = await clickElement(xpath);
          return formatResult(result);
        },
        {
          name: "click_element",
          description: "Click an element by xpath. Use xpaths from get_page_layout.",
          schema: z.object({
            xpath: z.string().describe("The xpath of the element to click"),
          }),
        },
      ) as StructuredToolInterface,
      tool(
        async ({ xpath, value }: { xpath: string; value: string }) => {
          const result = await inputText(xpath, value ?? "");
          return formatResult(result);
        },
        {
          name: "input_text",
          description: "Set input or textarea value by xpath.",
          schema: z.object({
            xpath: z.string().describe("The xpath of the input element"),
            value: z.string().describe("The text to enter"),
          }),
        },
      ) as StructuredToolInterface,
      tool(
        async ({ xpath }: { xpath: string }) => {
          const result = await submitForm(xpath);
          return formatResult(result);
        },
        {
          name: "submit_form",
          description: "Submit a form or click a submit button by xpath.",
          schema: z.object({
            xpath: z.string().describe("The xpath of the form or submit button"),
          }),
        },
      ) as StructuredToolInterface,
      tool(
        async ({ url }: { url: string }) => {
          const result = await navigateToUrl(url);
          return formatResult(result);
        },
        {
          name: "navigate",
          description: "Navigate the current tab to a URL. Include https:// when needed.",
          schema: z.object({
            url: z.string().describe("The URL to navigate to"),
          }),
        },
      ) as StructuredToolInterface,
    ];
  },
};
