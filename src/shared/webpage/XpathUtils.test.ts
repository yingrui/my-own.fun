import { describe, expect, it } from "vitest";
import getXpath from "./XpathUtils";
import jQuery from "jquery";

describe("XpathUtils", () => {
  const html = `<html>
  <head><title>Test</title></head>
  <body>
    <div>
        <span>test</span>
    </div>
    <div id="div_with_id">
        <ul><li class="l1">l1</li><li class="l2">l2</li></ul>
    </div>
    <div>
        <ul><li class="l3">l3</li><li>l4</li></ul>
    </div>
  </body>
</html>`;
  const htmlDoc = new DOMParser().parseFromString(html, "text/html");

  it("should return xpath of body", async () => {
    const body = htmlDoc.body;
    expect(getXpath(body)).toBe("//body");
  });

  it("should return xpath of div with id", async () => {
    const element = jQuery("#div_with_id", htmlDoc)[0];
    expect(getXpath(element)).toBe('//div[@id="div_with_id"]');
  });

  it("should return xpath of li", async () => {
    let element = jQuery(".l1", htmlDoc)[0];
    expect(getXpath(element)).toBe('//div[@id="div_with_id"]/ul/li[1]');
    element = jQuery(".l2", htmlDoc)[0];
    expect(getXpath(element)).toBe('//div[@id="div_with_id"]/ul/li[2]');
    element = jQuery(".l3", htmlDoc)[0];
    expect(getXpath(element)).toBe("//body/div[3]/ul/li[1]");
  });

  it("should return xpath of span", async () => {
    const element = jQuery("span", htmlDoc)[0];
    expect(getXpath(element)).toBe("//body/div[1]/span");
  });
});
