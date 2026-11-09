import { describe, expect, it } from "vitest";
import { formatTargetText, parseTargetText } from "./targetText";

describe("parseTargetText", () => {
  it("reads one target per line, in the order they are written", () => {
    const result = parseTargetText("https://example.com\n/Users/me/notes.md\nraycast://extensions/a/b/c");
    expect(result.ok && result.value.map((target) => target.link)).toEqual([
      "https://example.com",
      "/Users/me/notes.md",
      "raycast://extensions/a/b/c",
    ]);
  });

  it("reads the application written after the separator", () => {
    const result = parseTargetText("https://example.com | Google Chrome");
    expect(result.ok && result.value[0]).toEqual({ link: "https://example.com", application: "Google Chrome" });
  });

  it("splits on the last separator, so a link may contain one", () => {
    const result = parseTargetText("https://example.com/?q=a|b | Safari");
    expect(result.ok && result.value[0]).toEqual({ link: "https://example.com/?q=a|b", application: "Safari" });
  });

  it("ignores blank lines rather than calling them errors", () => {
    const result = parseTargetText("\nhttps://example.com\n\n  \n/Users/me/notes.md\n");
    expect(result.ok && result.value).toHaveLength(2);
  });

  it("numbers errors by the lines that carry content", () => {
    const result = parseTargetText("https://example.com\n\nexample.com");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toContain("line 2");
  });

  it("rejects text with nothing in it", () => {
    expect(parseTargetText("  \n\n")).toEqual({ ok: false, errors: ["targets: add at least one link"] });
  });
});

describe("formatTargetText", () => {
  it("round-trips through parseTargetText", () => {
    const text = "https://example.com\nhttps://example.com | Google Chrome\n/Users/me/notes.md";
    const parsed = parseTargetText(text);
    expect(parsed.ok && formatTargetText(parsed.value)).toBe(text);
  });

  it("leaves the separator off when no application is set", () => {
    expect(formatTargetText([{ link: "https://example.com" }])).toBe("https://example.com");
  });
});
