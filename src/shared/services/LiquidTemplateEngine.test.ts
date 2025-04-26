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

  const mockStorage = (stubTemplate: Template) => {
    return {
      set: (any: any): Promise<void> =>
        new Promise((resolve) => {
          resolve();
        }),
      get: (any: any): Promise<{ [key: string]: Template }> =>
        new Promise((resolve) => {
          resolve({ [stubTemplate.id]: _.clone(stubTemplate) });
        }),
    };
  };

  it("should render template with parameter", async () => {
    const template = stubTemplate("test-template");
    expect(template.id).toBe("__template_test-template");
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
      template: defaultTemplate.template,
      modifiedTemplate: "Bonjour, {{name}}!",
      parameters: [{ name: "name", type: "string", defaultValue: "world" }],
    });

    const repo = new TemplateRepository(
      mockStorage(saved) as chrome.storage.StorageArea, // mock storage should return the saved template.
    );
    const engine = new LiquidTemplateEngine({}, repo);
    const actualResult = await engine
      .add(defaultTemplate)
      .render(defaultTemplate.id, { name: "world" });

    // Template engine should use saved template to render.
    expect(actualResult).toBe("Bonjour, world!");
  });
});
