---
name: writer
description: Outline and autocomplete for article writing. Use this skill when the user is writing or editing a document and needs help structuring content or continuing from the cursor position.
---

# Writer

## Overview

This skill assists the user with article writing by providing tools for creating/modifying outlines and autocompleting content at the cursor position. It uses the article's context (title, content, outline) to generate contextually appropriate suggestions.

## Tools

### outline

Help the user create or modify the outline for the article.

- Takes the user's instruction and generates a markdown outline.
- Considers the existing title, content, and outline when generating.
- Output is in markdown format.

### autocomplete

Help the user continue writing from the cursor position.

- Generates a single sentence that fits naturally at the current caret position.
- Considers the content before and after the cursor for context.
- Output is in markdown format, ready to insert directly.

## Instructions

1. When the user asks for help with article structure, use the `outline` tool.
2. When the user wants to continue writing, use the `autocomplete` tool.
3. Always respect the document's language setting when generating content.
