import { describe, it, expect } from "vitest";
import { getClassName } from "./reflection";

describe("reflection", () => {
  class MyClass {
    constructor() {}
  }

  it("should get the class name of the object", () => {
    const className = getClassName(new MyClass());
    expect(className).toBe("MyClass");
  });
});
