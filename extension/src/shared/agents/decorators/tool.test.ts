import { describe, expect, it, beforeEach } from "vitest";
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

  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent();
  });

  const findTool = (name: string) =>
    TestAgent.prototype["__tool_methods"].find((t) => t.name === name);

  describe("Tool Registration", () => {
    it("should register add tool correctly", () => {
      const tool = findTool("add");
      expect(tool).toEqual(
        expect.objectContaining({
          name: "add",
          description: "add two numbers",
          required: ["left", "right"],
        }),
      );
    });

    it("should register write_file tool correctly", () => {
      const tool = findTool("write_file");
      expect(tool).toEqual(
        expect.objectContaining({
          name: "write_file",
          description: "write text to file system",
          required: ["text", "path"],
          properties: {
            text: { type: "string" },
            path: { type: "string" },
          },
        }),
      );
    });
  });

  describe("Tool Invocation", () => {
    it("should invoke add tool successfully", async () => {
      const result = await invokeTool(agent, "add", { left: 1, right: 2 });
      expect(result).toBe(3);
    });
  });

  describe("Error Handling", () => {
    it("should throw ToolNotFoundError for unknown tool", () => {
      expect(() => {
        invokeTool(agent, "unknown", { text: "text" });
      }).toThrow(ToolNotFoundError);
    });

    it("should throw RequiredParameterMissedError for missing parameter", () => {
      expect(() => {
        invokeTool(agent, "write_file", { text: "text" });
      }).toThrow(RequiredParameterMissedError);
    });

    it("should throw InvalidToolParameterError for invalid parameter", () => {
      expect(() => {
        invokeTool(agent, "write_file", {
          text: "text",
          path: "test.txt",
          wrongParameter: "wrong",
        });
      }).toThrow(InvalidToolParameterError);
    });

    it("should throw ToolParameterTypeError for wrong type", () => {
      expect(() => {
        invokeTool(agent, "write_file", { text: 123, path: "test.txt" });
      }).toThrow(ToolParameterTypeError);
    });
  });
});
