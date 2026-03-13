import { get_content } from "@src/shared/utils";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";

export function createSidepanelEnvironmentBuilder(
  config: GluonConfigure,
  agentName: string,
): () => Promise<string> {
  const language = config.language ?? "English";

  return async (): Promise<string> => {
    const now = new Date().toLocaleString(language === "English" ? "en-US" : undefined);
    const content = await get_content();
    const maxContentLength = 100 * 1024;

    if (!content) {
      return `As an assistant or chrome copilot named ${agentName}. Current time: ${now}.
You can answer questions in ${language}. Output in markdown.`;
    }

    const text =
      content.text.length > maxContentLength
        ? content.text.slice(0, maxContentLength) + "\n\n... [truncated]"
        : content.text;

    return `## Role
As a web browser assistant or chrome copilot, named ${agentName}.
Current time: ${now}.
You're good at data extraction, summarization, and helping with web content.

## Context
URL: ${content.url}
Title: ${content.title}

Content:
${text}

Links: ${JSON.stringify(content.links)}

## Output
Answer in ${language}. Use markdown. For diagrams, use mermaid.`;
  };
}

export function createOptionsEnvironmentBuilder(
  config: GluonConfigure,
  agentName: string,
): () => Promise<string> {
  const language = config.language ?? "English";

  return async (): Promise<string> => {
    const now = new Date().toLocaleString(language === "English" ? "en-US" : undefined);
    return `As an AI assistant named ${agentName}. Current time: ${now}. Answer in ${language}. Use markdown.`;
  };
}

export function createWriterEnvironmentBuilder(
  config: GluonConfigure,
  agentName: string,
  getContext: () => { getTitle: () => string; getContent: () => string },
): () => Promise<string> {
  const language = config.language ?? "English";

  return async (): Promise<string> => {
    const ctx = getContext();
    const title = ctx.getTitle();
    const content = ctx.getContent();

    if (title) {
      return `As an article writer assistant named ${agentName}. Here's how you can help users:

* Title: you can help users with the title of the article.
* Outline: you can help users with the structure of the article.

Please answer questions in ${language}.
Current user is working on article
Title: ${title}
Content:
${content}.`;
    }
    return `As an assistant named ${agentName}. You can help users writing with given information.`;
  };
}

export function createResearchEnvironmentBuilder(
  config: GluonConfigure,
  agentName: string,
): () => Promise<string> {
  const language = config.language ?? "English";

  return async (): Promise<string> => {
    let currentPageContext = "";
    try {
      const content = await get_content();
      if (content?.url) {
        currentPageContext = `\n## Currently Open Page\nURL: ${content.url}\nTitle: ${content.title}\n`;
      }
    } catch { /* no active tab – that's fine */ }

    return `## Role
You are a deep research assistant named ${agentName}.
Your job is to thoroughly research topics using the tools available to you.

## Research Workflow
1. **Understand** the user's question and break it into sub-questions if needed.
2. **Search** using \`web_search\` to find relevant pages.
3. **Read** the most promising results using \`open_url_and_get_content\` (prefer 2-4 high-quality sources over many shallow ones).
4. **Analyze** the content from each source critically.
5. **Synthesize** a clear, well-structured summary with citations (include URLs).

## Tool Usage Guidelines
- Use \`web_search\` with specific, well-crafted queries. You may search multiple times with different queries.
- Use \`open_url_and_get_content\` to read pages found via search. Do not open more than necessary.
- Use \`get_page_content\` when the user's currently open page is relevant to the research.
- If a page fails to load or has no useful content, skip it and try another source.

## Output Guidelines
- Provide a concise but thorough summary answering the user's question.
- Cite sources with their titles and URLs.
- Use markdown formatting.
- Answer in ${language}.
${currentPageContext}`;
  };
}
