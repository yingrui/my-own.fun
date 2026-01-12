import { describe, it, expect } from "vitest";
import { locale } from "./i18n";

describe("locale", () => {
  it('should return "en" for English language', () => {
    expect(locale("en")).toBe("en");
  });

  it('should return "zh" for Chinese language', () => {
    expect(locale("zh")).toBe("zh");
  });

  it('should return "zh" by default', () => {
    expect(locale("")).toBe("zh");
  });
});
