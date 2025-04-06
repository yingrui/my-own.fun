import { describe, expect, it } from "vitest";
import { getInputs, getLinks, getText } from "./ElementUtils";
import jQuery from "jquery";
import _ from "lodash";

describe("ElementUtils", () => {
  const html = `<html>
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
  const htmlDoc = new DOMParser().parseFromString(html, "text/html");

  it("should get links", async () => {
    const element = jQuery("ul", htmlDoc)[0];
    const links = getLinks(element);
    expect(links.length).toBe(2);
    expect(links[0].text).toBe("a1");
    expect(links[0].href).toBe("/a1");
    expect(links[1].text).toBe("a2");
    expect(links[1].href).toBe("/a2");
  });

  it("should get text", async () => {
    const element = jQuery("ul", htmlDoc)[0];
    const text = getText(element);
    expect(text).toContain("a1");
    expect(text).toContain("a2");
  });

  it("should get button", async () => {
    const inputs = getInputs(jQuery("form", htmlDoc)[0]);
    const button = _.find(inputs, (input) => {
      return input.tag === "button";
    });
    expect(button.xpath).toBe('//form[@id="f1"]/button[1]');
    expect(button.name).toBe("Ok");
  });

  it("should get select", async () => {
    const inputs = getInputs(jQuery("form", htmlDoc)[0]);
    const input = _.find(inputs, (i) => {
      return i.tag === "select";
    });
    expect(input.xpath).toBe('//form[@id="f1"]/select[1]');
    expect(input.name).toBe("role");
    const selected = input.options.filter((o) => o.selected)[0];
    expect(selected.value).toBe("2");
    expect(selected.text).toBe("admin");
  });

  it("should get inputs", async () => {
    const inputs = getInputs(jQuery("form", htmlDoc)[0]);
    const input = _.find(inputs, (i) => {
      return i.tag === "input";
    });
    expect(input.xpath).toBe('//form[@id="f1"]/input[1]');
    expect(input.name).toBe("username");
    expect(input.type).toBe("text");
    expect(input.value).toBe("input1");
  });

  it("should ignore hidden inputs", async () => {
    const inputs = getInputs(jQuery("form", htmlDoc)[0]);
    const input = _.find(inputs, (i) => {
      return i.tag === "input" && i.type === "hidden";
    });
    expect(input).toBeUndefined();
  });
});
