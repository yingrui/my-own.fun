import { describe, expect, it } from "vitest";
import { Tool } from "./tool";

describe("ToolDecorators", () => {
  class TestAgent {
    @Tool({ description: "add two numbers", required: ["left", "right"] })
    add(left: number, right: number): number {
      return left + right;
    }

    @Tool({
      description: "write text to file system",
      required: ["text", "path"],
      properties: { text: { type: "string" }, path: { type: "string" } },
    })
    write_file(text: string, path: string): string {
      return `write ${text.length} characters to ${path}`;
    }
  }

  it("should get add tool", () => {
    const agent = new TestAgent();
    const tool = TestAgent.prototype["__tool_methods"].find(
      (t) => t.name === "add",
    );
    expect(tool.name).toBe("add");
    expect(tool.description).toBe("add two numbers");
    expect(tool.required).toEqual(["left", "right"]);
  });

  it("should get write_file tool", () => {
    const agent = new TestAgent();
    const tool = TestAgent.prototype["__tool_methods"].find(
      (t) => t.name === "write_file",
    );
    expect(tool.name).toBe("write_file");
    expect(tool.description).toBe("write text to file system");
    expect(tool.required).toEqual(["text", "path"]);
    expect(tool.properties).toEqual({
      text: { type: "string" },
      path: { type: "string" },
    });
  });
});
