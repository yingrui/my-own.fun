---
name: web-surfing
description: Interact with the current page - get layout with clickable elements and inputs, click links/buttons, fill forms, submit, and navigate. Use when the user wants to browse, interact with, or automate actions on the current webpage.
---

# Web Surfing

## Overview

This skill enables the agent to interact with the currently open browser tab: read the page structure (layout tree with xpaths for links and inputs), click elements, fill form fields, submit forms, and navigate to URLs. It uses a parsed layout tree to target elements by xpath.

## Tools

### get_page_layout

Get the current page's layout tree with xpaths for links, inputs, and buttons. Call this first when the user wants to interact with the page. Returns url, title, and a nested structure where each node has `xpath`, `text`, `links` (with xpath), and `inputs` (with xpath, type, value).

### click_element

Click an element by its xpath. Use xpaths from `get_page_layout`. Use for links, buttons, or any clickable element.

### input_text

Set the value of an input or textarea by xpath. Provide the xpath from `get_page_layout` and the text to enter. Dispatches input/change events so the page reacts.

### submit_form

Submit a form or click a submit button by xpath. Use the xpath of a form element or a submit button.

### navigate

Navigate the current tab to a URL. Use when the user wants to go to a new page. Ensure the URL is complete (include https:// when needed).

## Workflow

1. When the user wants to interact with the page, call `get_page_layout` to get the structure.
2. Find the relevant element (link, input, button) in the layout by its text or role.
3. Use `click_element` for links and buttons, `input_text` for form fields, `submit_form` for form submission.
4. Use `navigate` to go to a new URL when needed.
5. After navigation or a page change, call `get_page_layout` again to get the updated structure.

## Instructions

- Always call `get_page_layout` before attempting to click, input, or submit.
- Match elements by their `text` or `name` to find the right xpath.
- For forms: fill inputs with `input_text` first, then `submit_form` with the form or submit button xpath.
- If an action fails, the tool returns an error message—report it to the user and suggest alternatives.
