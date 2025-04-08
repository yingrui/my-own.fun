import { describe, expect, it } from "vitest";
import { invokeTool, Tool } from "./tool";
import {
  InvalidToolParameterError,
  RequiredParameterMissedError,
  ToolNotFoundError,
  ToolParameterTypeError,
} from "@src/shared/agents/core/errors/ToolErrors";

describe("ToolDecorators", () => {
  class TestAgent {
    @Tool({
      description: "add two numbers",
      required: ["left", "right"],
      properties: { left: { type: "number" }, right: { type: "number" } },
    })
    async add(left: number, right: number): Promise<number> {
      // sleep 10 millisecond
      await new Promise((resolve) => setTimeout(resolve, 10));
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

  const agent = new TestAgent();

  it("should get add tool", () => {
    const tool = TestAgent.prototype["__tool_methods"].find(
      (t) => t.name === "add",
    );
    expect(tool.name).toBe("add");
    expect(tool.description).toBe("add two numbers");
    expect(tool.required).toEqual(["left", "right"]);
  });

  it("should get write_file tool", () => {
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

  it("should be able to invoke tool", async () => {
    const result = await invokeTool(agent, "add", { left: 1, right: 2 });
    expect(result).toBe(3);
  });

  it("should throw ToolNotFoundError", () => {
    expect(() => {
      invokeTool(agent, "unknown", { text: "text" });
    }).toThrowError(new ToolNotFoundError("unknown"));
  });

  it("should throw RequiredParameterMissedError when parameter is not valid", () => {
    expect(() => {
      invokeTool(agent, "write_file", { text: "text" });
    }).toThrowError(new RequiredParameterMissedError("write_file", "path"));
  });

  it("should throw InvalidToolParameterError when parameter is not valid", () => {
    expect(() => {
      invokeTool(agent, "write_file", {
        text: "text",
        path: "test.txt",
        wrongParameter: "wrong",
      });
    }).toThrowError(
      new InvalidToolParameterError("write_file", "wrongParameter"),
    );
  });

  it("should throw ToolParameterTypeError when type is wrong", () => {
    expect(() => {
      invokeTool(agent, "write_file", { text: 123, path: "test.txt" });
    }).toThrowError(
      new ToolParameterTypeError("write_file", "text", "string", "number"),
    );
  });
});
