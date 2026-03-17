---
name: web-surfing
description: Interact with the current page - get layout with clickable elements and inputs, click links/buttons, fill forms, submit, and navigate. Use when the user wants to browse, interact with, or automate actions on the current webpage.
---

# Web Surfing

## Overview

This skill enables the agent to interact with the currently open browser tab: read the page structure (layout tree with xpaths for links and inputs), click elements, fill form fields, submit forms, and navigate to URLs. It uses a parsed layout tree to target elements by xpath.

## Tools

### get_page_layout

Get the current page's layout tree with xpaths for links, inputs, and buttons. Returns YAML format (compact, saves tokens). Call this first when the user wants to interact with the page. Returns url, title, and a nested structure where each node has `xpath`, `text`, `links` (with xpath), and `inputs` (with xpath, type, value).

### get_page_content

Get the text content, title, URL, and links of a webpage. Pass `tab_id` (from get_open_tabs) to read a specific tab; omit for the current active tab. Use when the user asks about a page, wants a summary, or needs information from it. Returns url, title, text body, and hyperlinks.

### get_open_tabs

List all open tabs in the current window. Returns id, title, and url for each tab. Use tab ids with get_page_content to read content from a specific tab (e.g. when the user asks about another open tab).

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
2. When the user asks about a specific tab or "all my tabs", call `get_open_tabs` first.
3. When the user asks about page content, wants a summary, or needs text from it, call `get_page_content` (with optional tab_id for a specific tab).
4. Find the relevant element (link, input, button) in the layout by its text or role.
5. Use `click_element` for links and buttons, `input_text` for form fields, `submit_form` for form submission.
6. Use `navigate` to go to a new URL when needed.
7. After navigation or a page change, call `get_page_layout` again to get the updated structure, or call `get_page_content` if it's just a content page.

## Instructions

- Always call `get_page_layout` before attempting to click, input, or submit.
- Match elements by their `text` or `name` to find the right xpath.
- For forms: fill inputs with `input_text` first, then `submit_form` with the form or submit button xpath.
- Use `get_open_tabs` when the user asks about open tabs or wants to read content from a tab other than the active one.
- Use `get_page_content` to read a page's text. Omit tab_id for the current tab; pass tab_id from get_open_tabs for a specific tab.
- If an action fails, the tool returns an error message—report it to the user and suggest alternatives.

