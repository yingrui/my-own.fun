import { describe, it, expect } from "vitest";
import ChatMessage from "./ChatMessage";
import Interaction, { Step } from "./Interaction";

describe("Interaction", () => {
  describe("Steps", () => {
    it("should be able to parse the message", () => {
      const step = new Step();
      step.setMessage(`<think>
reasoning message
</think>

message content`);
      expect(step.reasoning).toBe("<think>\nreasoning message\n</think>");
      expect(step.content).toBe("message content");
    });
  });
});
