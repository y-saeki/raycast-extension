import { describe, expect, it } from "vitest";
import { formatImportConfirmation, summarizeImport } from "./importSummary";
import type { UrlRule } from "../rules/types";

const siteRule: UrlRule = {
  id: "user.example",
  name: "Example",
  match: { hosts: ["example.com"] },
  actions: { queryMode: "removeAll" },
};

describe("summarizeImport", () => {
  it("lists each rule with what it matches", () => {
    const { lines } = summarizeImport([siteRule]);
    expect(lines).toEqual(["• Example — example.com"]);
  });

  it("describes a rule without match conditions as matching every URL", () => {
    const { lines, hasGlobalRule } = summarizeImport([
      { id: "user.all", name: "All", stage: "global", match: {}, actions: { queryMode: "removeAll" } },
    ]);
    expect(lines).toEqual(["• All — every URL"]);
    expect(hasGlobalRule).toBe(true);
  });

  it("collects the hosts an imported rule would rewrite URLs to", () => {
    const { rewrittenHosts } = summarizeImport([
      siteRule,
      { id: "user.redirect", name: "Redirect", match: { hosts: ["example.com"] }, actions: { setHost: "evil.test" } },
    ]);
    expect(rewrittenHosts).toEqual(["evil.test"]);
  });

  it("reports each rewritten host once", () => {
    const { rewrittenHosts } = summarizeImport([
      { id: "user.a", name: "A", match: { hosts: ["a.test"] }, actions: { setHost: "evil.test" } },
      { id: "user.b", name: "B", match: { hosts: ["b.test"] }, actions: { setHost: "evil.test" } },
    ]);
    expect(rewrittenHosts).toEqual(["evil.test"]);
  });
});

describe("formatImportConfirmation", () => {
  it("warns about host rewrites", () => {
    const message = formatImportConfirmation([
      { id: "user.redirect", name: "Redirect", match: { hosts: ["example.com"] }, actions: { setHost: "evil.test" } },
    ]);
    expect(message).toContain("Rewrites the host");
    expect(message).toContain("evil.test");
  });

  it("warns about a rule matching every URL", () => {
    const message = formatImportConfirmation([
      { id: "user.all", name: "All", stage: "global", match: {}, actions: { queryMode: "removeAll" } },
    ]);
    expect(message).toContain("matches every URL");
  });

  it("stays free of warnings for an ordinary site rule", () => {
    const message = formatImportConfirmation([siteRule]);
    expect(message).not.toContain("⚠️");
    expect(message).toContain("will be replaced");
  });
});
