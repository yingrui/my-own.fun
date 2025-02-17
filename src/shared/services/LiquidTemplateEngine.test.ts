import { afterEach, describe, expect, it, vi } from "vitest";
import LiquidTemplateEngine from "@src/shared/services/LiquidTemplateEngine";
import Template from "@src/shared/agents/services/Template";
import TemplateRepository from "@src/shared/repositories/TemplateRepository";
import _ from "lodash";

describe("LiquidTemplateEngine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const stubTemplate = (name: string) => {
    return new Template({
      name: name,
      template: "Hello, {{name}}!",
      parameters: [{ name: "name", type: "string", defaultValue: "world" }],
    });
  };

  it("should render template with parameter", async () => {
    const template = stubTemplate("test-template");
    const engine = new LiquidTemplateEngine({});
    const actualResult = await engine
      .add(template)
      .render(template.id, { name: "world" });
    expect(actualResult).toBe("Hello, world!");
  });

  it("should use saved template to render", async () => {
    const templateName = "test-template";

    // Default template is not as same as the saved template.
    const defaultTemplate = stubTemplate(templateName);
    const saved = new Template({
      name: templateName,
      template: "Bonjour, {{name}}!",
      parameters: [{ name: "name", type: "string", defaultValue: "world" }],
    });
    const mockStorage = {
      set: (any: any): Promise<void> =>
        new Promise((resolve) => {
          resolve();
        }),
      get: (any: any): Promise<{ [key: string]: Template }> =>
        new Promise((resolve) => {
          resolve({ [saved.id]: _.clone(saved) });
        }),
    };
    // Template repository can return the saved template.
    const repo = new TemplateRepository(
      mockStorage as chrome.storage.StorageArea,
    );
    const engine = new LiquidTemplateEngine({}, repo);
    const actualResult = await engine
      .add(defaultTemplate)
      .render(defaultTemplate.id, { name: "world" });

    // Template engine should load the saved template to render.
    expect(actualResult).toBe("Bonjour, world!");
  });
});
