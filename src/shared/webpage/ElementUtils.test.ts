import { describe, expect, it, beforeEach } from "vitest";
import { getInputs, getLinks, getText } from "./ElementUtils";
import jQuery from "jquery";
import _ from "lodash";

describe("ElementUtils", () => {
  let htmlDoc: Document;
  let formElement: HTMLElement;

  const testHtml = `<html>
  <head><title>Test</title></head>
  <body>
    <div>
        <ul>
            <li><a href="/a1">a1</a></li>
            <li><a href="/a2">a2</li>
        </ul>
    </div>
    <form id="f1">
        <input type="text" name="username" value="input1"/>
        <input type="hidden" name="form-name" value="f1"/>
        <select name="role">
            <option value="1">user</option>
            <option value="2" selected="selected">admin</option>
        </select>
        <textarea name="introduction">this is a textarea</textarea>
        <button>Ok</button>
    </form>
  </body>
</html>`;

  beforeEach(() => {
    htmlDoc = new DOMParser().parseFromString(testHtml, "text/html");
    formElement = jQuery("form", htmlDoc)[0] as HTMLElement;
  });

  const findInputByTag = (tag: string) =>
    _.find(getInputs(formElement), (input) => input.tag === tag);

  describe("Link Extraction", () => {
    it("should extract links from element", () => {
      const element = jQuery("ul", htmlDoc)[0];
      const links = getLinks(element);

      expect(links).toHaveLength(2);
      expect(links[0]).toEqual(
        expect.objectContaining({
          text: "a1",
          href: "/a1",
        }),
      );
      expect(links[1]).toEqual(
        expect.objectContaining({
          text: "a2",
          href: "/a2",
        }),
      );
    });
  });

  describe("Text Extraction", () => {
    it("should extract text from element", () => {
      const element = jQuery("ul", htmlDoc)[0];
      const text = getText(element);

      expect(text).toContain("a1");
      expect(text).toContain("a2");
    });
  });

  describe("Form Input Extraction", () => {
    it("should extract button input", () => {
      const button = findInputByTag("button");

      expect(button).toEqual(
        expect.objectContaining({
          xpath: '//form[@id="f1"]/button[1]',
          name: "Ok",
        }),
      );
    });

    it("should extract select input", () => {
      const select = findInputByTag("select");

      expect(select).toEqual(
        expect.objectContaining({
          xpath: '//form[@id="f1"]/select[1]',
          name: "role",
        }),
      );

      const selected = select.options.filter((o) => o.selected)[0];
      expect(selected).toEqual(
        expect.objectContaining({
          value: "2",
          text: "admin",
        }),
      );
    });

    it("should extract text input", () => {
      const input = findInputByTag("input");

      expect(input).toEqual(
        expect.objectContaining({
          xpath: '//form[@id="f1"]/input[1]',
          name: "username",
          type: "text",
          value: "input1",
        }),
      );
    });

    it("should ignore hidden inputs", () => {
      const hiddenInput = _.find(
        getInputs(formElement),
        (i) => i.tag === "input" && i.type === "hidden",
      );

      expect(hiddenInput).toBeUndefined();
    });
  });
});
