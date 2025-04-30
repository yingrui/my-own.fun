import { describe, it, afterEach, expect, vi } from "vitest";
import TemplateRepository from "@src/shared/repositories/TemplateRepository";
import PromptTemplate from "@src/shared/agents/services/PromptTemplate";
import _ from "lodash";

describe("TemplateRepository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const stubTemplate = (name: string) => {
    const t = new PromptTemplate({
      name: name,
      template: "Hello, {{name}}!",
      parameters: [{ name: "name", type: "string", defaultValue: "world" }],
    });
    return t;
  };

  const template = stubTemplate("test-template");
  const mockStorage = {
    set: (any: any): Promise<void> =>
      new Promise((resolve) => {
        resolve();
      }),
    get: (any: any): Promise<{ [key: string]: PromptTemplate }> =>
      new Promise((resolve) => {
        resolve({ [template.id]: _.clone(template) });
      }),
  };

  it("should save and find template", async () => {
    const repo = new TemplateRepository(
      mockStorage as chrome.storage.StorageArea,
    );
    const saveOp = vi.spyOn(mockStorage, "set");
    const findOp = vi.spyOn(mockStorage, "get");

    await repo.save(template);
    const exists = await repo.exists(template.id);
    expect(exists).toBe(true);

    const actualResult = await repo.find(template.id);

    expect(saveOp).toHaveBeenCalledWith({ [template.id]: template });
    expect(findOp).toHaveBeenCalledWith([template.id]);
    expect(actualResult).toEqual(template);
  });
});
