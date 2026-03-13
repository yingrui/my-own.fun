/**
 * Writer skill - outline and autocomplete tools using WriterContext.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import type WriterContext from "@src/pages/options/writer/context/WriterContext";
import { createChatModel } from "@src/shared/langgraph/ModelAdapter";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { Skill } from "../types";
import instructions from "./SKILL.md?raw";

export function createWriterSkill(
  config: GluonConfigure,
  context: WriterContext,
): Skill {
  const language = config.language ?? "English";

  return {
    id: "writer",
    name: "Writer",
    description: "Outline and autocomplete for the article.",
    instructions,

    getTools() {
      return [
        tool(
          async ({ userInput }: { userInput: string }) => {
            const title = context.getTitle();
            const content = context.getContent();
            const outline = context.getOutline();
            const outlineStr = JSON.stringify(outline ?? [], null, 2);

            const systemPrompt = `## Role & Task
You're a great editor. 
Now we need your help to create an outline for the article.

## Context of the Article

### Title
${title}

### Current Outline
${outlineStr}

### Content
${content}

### Language
${language}

### User Instruction
${userInput}

## Output Instruction
Please think about the structure of the article and provide an outline in markdown format.`;

            const llm = createChatModel(config);
            const response = await llm.invoke([
              new HumanMessage(systemPrompt),
            ]);
            const text =
              typeof response.content === "string"
                ? response.content
                : String(response.content ?? "");
            return text;
          },
          {
            name: "outline",
            description:
              "Help user to create or modify the outline for the article.",
            schema: z.object({ userInput: z.string() }),
          },
        ),
        tool(
          async ({ userInput }: { userInput: string }) => {
            const sel = context.getSelectionRange();
            const content = context.getContent();
            const firstPart = content.slice(0, sel.selectionStart);
            const secondPart = content.slice(sel.selectionEnd);

            const systemPrompt = `## Role
You're a great editor. 
Consider the context, you can try to add 1 sentence to current caret position of document.

## Context

### Title
${context.getTitle()}

### Content

#### Before Caret Position
${firstPart}

#### After Caret Position
${secondPart}

## Output Instruction
Directly give the sentence with markdown format, so AI assistant can directly add to caret position.
Do not repeat the content before and after caret position.

## User Input
${userInput}`;

            const llm = createChatModel(config);
            const response = await llm.invoke([
              new SystemMessage(systemPrompt),
              new HumanMessage(`please provide better content in ${language}:`),
            ]);
            const text =
              typeof response.content === "string"
                ? response.content
                : String(response.content ?? "");
            return text;
          },
          {
            name: "autocomplete",
            description: "Help user to continue writing from the cursor.",
            schema: z.object({ userInput: z.string() }),
          },
        ),
      ];
    },
  };
}
