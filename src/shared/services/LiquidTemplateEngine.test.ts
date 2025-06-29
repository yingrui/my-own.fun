import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import LiquidTemplateEngine from "@src/shared/services/LiquidTemplateEngine";
import PromptTemplate from "@src/shared/agents/services/PromptTemplate";
import TemplateRepository from "@src/shared/repositories/TemplateRepository";
import _ from "lodash";

describe("LiquidTemplateEngine", () => {
  let engine: LiquidTemplateEngine;

  const createTemplate = (
    name: string,
    template: string = "Hello, {{name}}!",
    modifiedTemplate?: string,
    allowEmptyTemplate: boolean = false,
  ) => {
    return new PromptTemplate({
      name: name,
      template: template,
      modifiedTemplate: modifiedTemplate,
      allowEmptyTemplate: allowEmptyTemplate,
      parameters: [{ name: "name", type: "string", defaultValue: "world" }],
    });
  };

  const createMockStorage = (savedTemplate: PromptTemplate) => ({
    set: (): Promise<void> => Promise.resolve(),
    get: (): Promise<{ [key: string]: PromptTemplate }> =>
      Promise.resolve({ [savedTemplate.id]: _.clone(savedTemplate) }),
  });

  beforeEach(() => {
    engine = new LiquidTemplateEngine({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render template with parameter", async () => {
    const template = createTemplate("test-template");
    expect(template.id).toBe("__template_test-template");

    const result = await engine
      .add(template)
      .render(template.id, { name: "world" });
    expect(result).toBe("Hello, world!");
  });

  it("should use saved template when available", async () => {
    const templateName = "test-template";
    const defaultTemplate = createTemplate(templateName);
    const savedTemplate = createTemplate(
      templateName,
      defaultTemplate.template,
      "Bonjour, {{name}}!",
    );

    const mockStorage = createMockStorage(savedTemplate);
    const repo = new TemplateRepository(
      mockStorage as unknown as chrome.storage.StorageArea,
    );
    engine = new LiquidTemplateEngine({}, repo);

    const result = await engine
      .add(defaultTemplate)
      .render(defaultTemplate.id, { name: "world" });
    expect(result).toBe("Bonjour, world!");
  });

  it("should render empty template when allowEmptyTemplate is true", async () => {
    const templateName = "test-template";
    const defaultTemplate = createTemplate(templateName);
    const savedTemplate = createTemplate(
      templateName,
      defaultTemplate.template,
      "",
      true,
    );

    const mockStorage = createMockStorage(savedTemplate);
    const repo = new TemplateRepository(
      mockStorage as unknown as chrome.storage.StorageArea,
    );
    engine = new LiquidTemplateEngine({}, repo);

    const result = await engine
      .add(defaultTemplate)
      .render(defaultTemplate.id, { name: "world" });
    expect(result).toBe("");
  });

  it("should fallback to original template when modified template is empty and allowEmptyTemplate is false", async () => {
    const templateName = "test-template";
    const defaultTemplate = createTemplate(templateName);
    const savedTemplate = createTemplate(
      templateName,
      defaultTemplate.template,
      "",
      false,
    );

    const mockStorage = createMockStorage(savedTemplate);
    const repo = new TemplateRepository(
      mockStorage as unknown as chrome.storage.StorageArea,
    );
    engine = new LiquidTemplateEngine({}, repo);

    const result = await engine
      .add(defaultTemplate)
      .render(defaultTemplate.id, { name: "world" });
    expect(result).toBe("Hello, world!");
  });
});
