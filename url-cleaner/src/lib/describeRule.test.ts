import { describe, expect, it } from "vitest";
import type { UrlRule } from "../rules/types";
import { describeMatch } from "./describeRule";

function rule(match: UrlRule["match"]): UrlRule {
  return { id: "user.test", name: "Test", match, actions: { queryMode: "removeAll" } };
}

describe("describeMatch", () => {
  it("lists the hosts", () => {
    expect(describeMatch(rule({ hosts: ["example.com", "example.org"] }))).toBe("example.com, example.org");
  });

  it("marks the patterns as such", () => {
    expect(describeMatch(rule({ hostPattern: "^a\\.com$", pathPattern: "^/p" }))).toBe(
      "host =~ ^a\\.com$, path =~ ^/p",
    );
  });

  it("joins the conditions with the given separator", () => {
    expect(describeMatch(rule({ hosts: ["example.com"], pathPattern: "^/p" }), "  ·  ")).toBe(
      "example.com  ·  path =~ ^/p",
    );
  });

  it("describes a rule without conditions as matching every URL", () => {
    expect(describeMatch(rule({}))).toBe("every URL");
  });

  it("ignores hasParams, which says nothing about which URLs are matched", () => {
    expect(describeMatch(rule({ hasParams: ["v"] }))).toBe("every URL");
  });
});
