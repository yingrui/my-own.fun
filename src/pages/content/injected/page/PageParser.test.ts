import { describe, it, expect } from "vitest";
import PageParser from "@pages/content/injected/page/PageParser";

describe("PageParser", () => {
  const html =
    "<html>" +
    "<head><title>Test</title></head>" +
    "<body><h1>Hello, World!</h1></body>" +
    "</html>";

  it("should return page content", async () => {
    const htmlDoc = new DOMParser().parseFromString(html, "text/html");
    const parser = new PageParser(htmlDoc);
    const page = parser.parseContent();
    expect(page.title).toBe("Test");
    expect(page.url).not.toBe(null);
    expect(page.text).toBe("Hello, World!");
    expect(page.links).toEqual([]);
  });
});
