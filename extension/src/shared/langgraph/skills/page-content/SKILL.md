---
name: page-content
description: Get the current webpage's URL, title, text content, and links. Use this skill when the user asks about the page they are currently viewing, wants a summary, or needs information extracted from it. You decide when to call it; page content is not pre-injected.
---

# Page Content

## Overview

This skill provides the agent with the ability to read the content of the currently active browser tab on demand. It extracts the page URL, title, text body, and all hyperlinks. You decide when to call `get_page_content` based on the user's question—do not assume the page is always relevant.

## Tools

### get_page_content

Get the text content, title, URL, and links of the currently viewed webpage.

- Use when the user asks about the page, wants a summary, or needs information from the page.
- Content is truncated to 100KB for very large pages.
- Returns structured JSON with `url`, `title`, `text`, and `links` fields.

## Instructions

1. When the user asks about the current page, wants a summary, or needs information from it, call `get_page_content`.
2. Use the extracted text and metadata to answer the user's question.
3. If the page content is unavailable, inform the user they may need to refresh the page.
