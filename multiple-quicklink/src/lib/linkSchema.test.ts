import { homedir } from "node:os";
import { describe, expect, it } from "vitest";
import { classifyLink, MAX_TARGETS_PER_SET, parseQuicklink, parseQuicklinks, resolveLink } from "./linkSchema";

describe("classifyLink", () => {
  it("recognises a raycast deeplink before treating it as an ordinary URL", () => {
    expect(classifyLink("raycast://extensions/raycast/raycast/confetti")).toBe("deeplink");
  });

  it("recognises URLs of any scheme", () => {
    expect(classifyLink("https://example.com/a?b=c")).toBe("url");
    expect(classifyLink("slack://channel?team=T1")).toBe("url");
  });

  it("recognises absolute paths on both platforms", () => {
    expect(classifyLink("/Users/me/notes.md")).toBe("path");
    expect(classifyLink("~/notes.md")).toBe("path");
    expect(classifyLink("C:\\Users\\me\\notes.md")).toBe("path");
  });

  it("rejects a bare host name, which cannot be told apart from a relative path", () => {
    expect(classifyLink("example.com")).toBeUndefined();
    expect(classifyLink("notes/todo.md")).toBeUndefined();
  });
});

describe("resolveLink", () => {
  it("expands a leading tilde, which the OS does not do for us", () => {
    expect(resolveLink("~/notes.md")).toBe(`${homedir()}/notes.md`);
    expect(resolveLink("~")).toBe(homedir());
  });

  it("leaves everything else untouched, including a tilde inside a URL", () => {
    expect(resolveLink("https://example.com/~me")).toBe("https://example.com/~me");
    expect(resolveLink("/tmp/~cache")).toBe("/tmp/~cache");
  });
});

describe("parseQuicklink", () => {
  const valid = { id: "set-1", name: "Morning", targets: [{ link: "https://example.com" }] };

  it("accepts a set with a name and at least one target", () => {
    const result = parseQuicklink(valid);
    expect(result).toEqual({ ok: true, value: valid });
  });

  it("keeps the application a target should open in", () => {
    const result = parseQuicklink({
      ...valid,
      targets: [{ link: "https://example.com", application: "Google Chrome" }],
    });
    expect(result.ok && result.value.targets[0].application).toBe("Google Chrome");
  });

  it("requires a name", () => {
    const result = parseQuicklink({ ...valid, name: "  " });
    expect(result).toEqual({ ok: false, errors: ["name: required"] });
  });

  it("requires at least one target, since an empty set would do nothing", () => {
    const result = parseQuicklink({ ...valid, targets: [] });
    expect(result).toEqual({ ok: false, errors: ["targets: add at least one link"] });
  });

  it("caps how many targets one set can open", () => {
    const targets = Array.from({ length: MAX_TARGETS_PER_SET + 1 }, () => ({ link: "https://example.com" }));
    const result = parseQuicklink({ ...valid, targets });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toContain(`at most ${MAX_TARGETS_PER_SET}`);
  });

  it("names the offending line when a link is not usable", () => {
    const result = parseQuicklink({
      ...valid,
      targets: [{ link: "https://example.com" }, { link: "example.com" }],
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toContain("targets: line 2");
    expect(!result.ok && result.errors[0]).toContain("https://example.com");
  });
});

describe("parseQuicklinks", () => {
  it("drops the entries that no longer validate and keeps the rest", () => {
    const sets = parseQuicklinks([
      { id: "set-1", name: "Good", targets: [{ link: "https://example.com" }] },
      { id: "set-2", name: "", targets: [] },
      "not a set",
    ]);
    expect(sets.map((set) => set.name)).toEqual(["Good"]);
  });

  it("returns nothing for a value that is not a list", () => {
    expect(parseQuicklinks({ nope: true })).toEqual([]);
  });
});
