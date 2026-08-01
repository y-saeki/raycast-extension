import { describe, expect, it } from "vitest";
import type { UrlRule } from "../rules/types";
import { cleanUrl } from "./cleanUrl";
import { applyRules, matchRule } from "./ruleEngine";

function rule(partial: Partial<UrlRule> & Pick<UrlRule, "match" | "actions">): UrlRule {
  return { id: "user.test", name: "Test", ...partial };
}

describe("matchRule", () => {
  it("matches a host and its subdomains, but not a lookalike domain", () => {
    const r = rule({ match: { hosts: ["example.com"] }, actions: { queryMode: "removeAll" } });
    expect(matchRule(r, new URL("https://example.com/a"))).toBeDefined();
    expect(matchRule(r, new URL("https://www.example.com/a"))).toBeDefined();
    expect(matchRule(r, new URL("https://notexample.com/a"))).toBeUndefined();
  });

  it("requires every declared condition to match", () => {
    const r = rule({
      match: { hosts: ["example.com"], pathPattern: "^\\/posts\\/" },
      actions: { queryMode: "removeAll" },
    });
    expect(matchRule(r, new URL("https://example.com/posts/1"))).toBeDefined();
    expect(matchRule(r, new URL("https://example.com/about"))).toBeUndefined();
  });

  it("matches patterns case-insensitively", () => {
    const r = rule({ match: { pathPattern: "^\\/Posts$" }, actions: { queryMode: "removeAll" } });
    expect(matchRule(r, new URL("https://example.com/posts"))).toBeDefined();
  });

  it("never matches when a pattern is not a valid regular expression", () => {
    const r = rule({ match: { pathPattern: "^\\/([a-z" }, actions: { queryMode: "removeAll" } });
    expect(matchRule(r, new URL("https://example.com/abc"))).toBeUndefined();
  });

  it("requires every parameter listed in hasParams to be present", () => {
    const r = rule({
      match: { hosts: ["example.com"], hasParams: ["v", "t"] },
      actions: { queryMode: "removeAll" },
    });
    expect(matchRule(r, new URL("https://example.com/p?v=1&t=2&x=3"))).toBeDefined();
    expect(matchRule(r, new URL("https://example.com/p?v=1"))).toBeUndefined();
    expect(matchRule(r, new URL("https://example.com/p"))).toBeUndefined();
  });

  it("treats an empty hasParams value as present", () => {
    const r = rule({ match: { hasParams: ["v"] }, actions: { queryMode: "removeAll" } });
    expect(matchRule(r, new URL("https://example.com/p?v="))).toBeDefined();
  });

  it("matches every URL when the rule declares no condition", () => {
    const r = rule({ match: {}, actions: { queryMode: "removeAll" } });
    expect(matchRule(r, new URL("https://anything.example/x"))).toEqual([]);
  });
});

describe("query modes", () => {
  const url = "https://example.com/p?a=1&b=2&c=3";

  it("keepAll leaves the query alone", () => {
    const r = rule({ match: { hosts: ["example.com"] }, actions: { queryMode: "keepAll" } });
    expect(cleanUrl(url, [r])).toBe(url);
  });

  it("removeAll drops every parameter", () => {
    const r = rule({ match: { hosts: ["example.com"] }, actions: { queryMode: "removeAll" } });
    expect(cleanUrl(url, [r])).toBe("https://example.com/p");
  });

  it("keepOnly keeps the listed parameters in their original order", () => {
    const r = rule({
      match: { hosts: ["example.com"] },
      actions: { queryMode: "keepOnly", queryParams: ["c", "a"] },
    });
    expect(cleanUrl(url, [r])).toBe("https://example.com/p?a=1&c=3");
  });

  it("remove drops only the listed parameters", () => {
    const r = rule({
      match: { hosts: ["example.com"] },
      actions: { queryMode: "remove", queryParams: ["b"] },
    });
    expect(cleanUrl(url, [r])).toBe("https://example.com/p?a=1&c=3");
  });

  it("leaves the original encoding untouched when nothing would be removed", () => {
    const encoded = "https://example.com/p?q=a%20b";
    const r = rule({
      match: { hosts: ["example.com"] },
      actions: { queryMode: "remove", queryParams: ["utm_source"] },
    });
    expect(cleanUrl(encoded, [r])).toBe(encoded);
  });
});

describe("actions", () => {
  it("interpolates path captures into setPath and setParams", () => {
    const r = rule({
      match: { hosts: ["example.com"], pathPattern: "^\\/articles\\/(\\d+)\\/.*$" },
      actions: { setPath: "/a/$1", setParams: { id: "$1" } },
    });
    expect(cleanUrl("https://example.com/articles/42/some-slug", [r])).toBe("https://example.com/a/42?id=42");
  });

  it("writes setParams before the parameters that survive the query mode", () => {
    const r = rule({
      match: { hosts: ["example.com"], pathPattern: "^\\/([^\\/]+)" },
      actions: { setParams: { v: "$1" }, queryMode: "keepOnly", queryParams: ["t"] },
    });
    expect(cleanUrl("https://example.com/abc?t=42&other=x", [r])).toBe("https://example.com/abc?v=abc&t=42");
  });

  it("rewrites the host", () => {
    const r = rule({ match: { hosts: ["old.example"] }, actions: { setHost: "new.example" } });
    expect(cleanUrl("https://old.example/p", [r])).toBe("https://new.example/p");
  });

  it("leaves an unmatched capture reference as written", () => {
    const r = rule({ match: { hosts: ["example.com"] }, actions: { setPath: "/x/$3" } });
    expect(cleanUrl("https://example.com/p", [r])).toBe("https://example.com/x/$3");
  });

  it("interpolates a query parameter into setPath, even when the same rule drops it", () => {
    const r = rule({
      match: { hosts: ["example.com"], hasParams: ["v"] },
      actions: { setPath: "/${v}", queryMode: "keepOnly", queryParams: ["t"] },
    });
    expect(cleanUrl("https://example.com/watch?v=abc&t=42&si=x", [r])).toBe("https://example.com/abc?t=42");
  });

  it("interpolates a query parameter into setHost", () => {
    const r = rule({
      match: { hosts: ["example.com"], hasParams: ["sub"] },
      actions: { setHost: "${sub}.example.com", queryMode: "removeAll" },
    });
    expect(cleanUrl("https://example.com/p?sub=docs", [r])).toBe("https://docs.example.com/p");
  });

  it("leaves a reference to a missing query parameter as written", () => {
    const r = rule({ match: { hosts: ["example.com"] }, actions: { setPath: "/x/${missing}" } });
    expect(cleanUrl("https://example.com/p", [r])).toBe("https://example.com/x/$%7Bmissing%7D");
  });
});

describe("rule ordering", () => {
  const first = rule({
    id: "user.first",
    name: "First",
    match: { hosts: ["example.com"] },
    actions: { setPath: "/first" },
  });
  const second = rule({
    id: "user.second",
    name: "Second",
    match: { hosts: ["example.com"] },
    actions: { setPath: "/second" },
  });

  it("applies only the first matching site rule", () => {
    expect(cleanUrl("https://example.com/p", [first, second])).toBe("https://example.com/first");
  });

  it("applies every matching global rule after the site stage", () => {
    const globalRule = rule({
      id: "user.global",
      name: "Global",
      stage: "global",
      match: {},
      actions: { queryMode: "remove", queryParams: ["utm_source"] },
    });
    expect(cleanUrl("https://example.com/p?utm_source=x&keep=1", [first, globalRule])).toBe(
      "https://example.com/first?keep=1",
    );
  });

  it("runs global rules even when they are listed before the site rules", () => {
    const globalRule = rule({
      id: "user.global",
      name: "Global",
      stage: "global",
      match: {},
      actions: { queryMode: "remove", queryParams: ["utm_source"] },
    });
    expect(cleanUrl("https://example.com/p?utm_source=x", [globalRule, first])).toBe("https://example.com/first");
  });

  it("reports whether any rule matched", () => {
    expect(applyRules(new URL("https://example.com/p"), [first])).toBe(true);
    expect(applyRules(new URL("https://other.example/p"), [first])).toBe(false);
  });

  it("skips a rule that is not in the list, which is how disabled rules are excluded", () => {
    expect(cleanUrl("https://example.com/p", [second])).toBe("https://example.com/second");
    expect(cleanUrl("https://example.com/p", [])).toBe("https://example.com/p");
  });
});
