import { describe, it, expect } from "vitest";
import { sha256 } from "./digest";

describe("sha256", () => {
  it("should generate the same hash for the same input", async () => {
    const input = "test message";
    const hash1 = await sha256(input);
    const hash2 = await sha256(input);
    expect(hash1).toBe(hash2);
  });

  it("should generate different hashes for different inputs", async () => {
    const input1 = "test message 1";
    const input2 = "test message 2";
    const hash1 = await sha256(input1);
    const hash2 = await sha256(input2);
    expect(hash1).not.toBe(hash2);
  });

  it("should generate a 64-character hex string", async () => {
    const input = "test message";
    const hash = await sha256(input);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should handle empty string", async () => {
    const input = "";
    const hash = await sha256(input);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should handle special characters", async () => {
    const input = "!@#$%^&*()_+{}|:\"<>?`~[]\\;',./";
    const hash = await sha256(input);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
