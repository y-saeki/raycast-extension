import { describe, expect, it } from "vitest";
import { parseRule } from "../lib/ruleSchema";
import { builtinRules } from "./index";
import { BUILTIN_ID_PREFIX } from "./types";

describe("built-in rules", () => {
  it("all pass the same validation as user-supplied rules", () => {
    for (const rule of builtinRules) {
      const result = parseRule(rule, { allowBuiltinIds: true });
      expect(result.ok, `${rule.id}: ${result.ok ? "" : result.errors.join("; ")}`).toBe(true);
    }
  });

  it("all use the reserved builtin id prefix", () => {
    for (const rule of builtinRules) {
      expect(rule.id.startsWith(BUILTIN_ID_PREFIX), rule.id).toBe(true);
    }
  });

  it("have unique ids", () => {
    const ids = builtinRules.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all carry a name and a description for the settings screen", () => {
    for (const rule of builtinRules) {
      expect(rule.name, rule.id).toBeTruthy();
      expect(rule.description, rule.id).toBeTruthy();
    }
  });

  it("order the specific Figma rule before its fallback, which would otherwise shadow it", () => {
    const slug = builtinRules.findIndex((rule) => rule.id === "builtin.figma.slug");
    const fallback = builtinRules.findIndex((rule) => rule.id === "builtin.figma.share-token");
    expect(slug).toBeGreaterThanOrEqual(0);
    expect(slug).toBeLessThan(fallback);
  });

  it("order the embedded playlist rule before the video path rule, which would otherwise shadow it", () => {
    const playlist = builtinRules.findIndex((rule) => rule.id === "builtin.youtube.embed-playlist");
    const videoPath = builtinRules.findIndex((rule) => rule.id === "builtin.youtube.video-path");
    expect(playlist).toBeGreaterThanOrEqual(0);
    expect(playlist).toBeLessThan(videoPath);
  });

  it("run the youtu.be shortening rule in the global scope, after the site rules have normalized the URL", () => {
    const shorten = builtinRules.find((rule) => rule.id === "builtin.youtube.shorten");
    expect(shorten?.scope).toBe("global");
  });
});
