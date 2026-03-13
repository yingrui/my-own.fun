---
name: research
description: Search the web and open pages to extract content for deep research. Use this skill when the user wants to find information online, study a topic, or needs up-to-date data from the web.
---

# Research

## Overview

This skill gives the agent the ability to perform deep web research by searching DuckDuckGo and reading full page content from URLs. It is designed for multi-step research workflows where the agent needs to gather, synthesize, and present information from multiple web sources.

## Tools

### web_search

Search the web using DuckDuckGo. Returns search results with titles, URLs, and abstracts.

- Use this as the first step to discover relevant pages for the user's research question.
- Formulate clear, specific search queries for best results.
- Review all search results before deciding which pages to open.

### open_url_and_get_content

Open a URL in a browser tab, extract the page content (title, text, links), then close the tab.

- Use this after `web_search` to read the full content of a promising search result.
- There is a limit of 8 pages per research session to manage resources.
- Content is truncated to 80KB if the page is very large.
- Prefer opening authoritative sources (official docs, Wikipedia, reputable news).

## Instructions

1. When the user asks a research question, start with `web_search` to find relevant sources.
2. Review the search results and identify 2-4 most promising URLs.
3. Use `open_url_and_get_content` to read the full content of selected pages.
4. Synthesize the information from multiple sources into a clear, well-structured answer.
5. Cite the sources you used with titles and URLs.
6. If initial results are insufficient, refine your search query and search again.
