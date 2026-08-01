import { describe, expect, it } from "vitest";
import { parseRule, parseRules, parseRulesJson } from "./ruleSchema";

const validRule = {
  id: "user.example",
  name: "Example",
  match: { hosts: ["example.com"] },
  actions: { queryMode: "remove", queryParams: ["utm_source"] },
};

function errorsOf(input: unknown): string[] {
  const result = parseRule(input);
  return result.ok ? [] : result.errors;
}

describe("parseRule", () => {
  it("accepts a valid rule and normalizes hosts", () => {
    const result = parseRule({ ...validRule, match: { hosts: [" Example.COM ", ""] } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.match.hosts).toEqual(["example.com"]);
  });

  it("requires an id and a name", () => {
    expect(errorsOf({ ...validRule, id: "" })).toContain("id: required");
    expect(errorsOf({ ...validRule, name: "  " })).toContain("name: required");
  });

  it("reserves the builtin id prefix for rules shipped with the extension", () => {
    expect(errorsOf({ ...validRule, id: "builtin.mine" }).join()).toContain("reserved");
    expect(parseRule({ ...validRule, id: "builtin.mine" }, { allowBuiltinIds: true }).ok).toBe(true);
  });

  it("rejects a match with no condition", () => {
    expect(errorsOf({ ...validRule, match: {} })).toContain(
      "match: needs at least one of hosts, hostPattern or pathPattern",
    );
  });

  it("rejects a pattern that is not a valid regular expression", () => {
    expect(errorsOf({ ...validRule, match: { pathPattern: "^\\/([a-z" } }).join()).toContain(
      "match.pathPattern: not a valid regular expression",
    );
  });

  it("rejects an unknown query mode", () => {
    expect(errorsOf({ ...validRule, actions: { queryMode: "dropEverything" } }).join()).toContain(
      "actions.queryMode: must be one of",
    );
  });

  it("requires queryParams for the keepOnly and remove modes", () => {
    expect(errorsOf({ ...validRule, actions: { queryMode: "keepOnly" } }).join()).toContain(
      'actions.queryParams: required when queryMode is "keepOnly"',
    );
  });

  it("rejects a rule whose actions would do nothing", () => {
    expect(errorsOf({ ...validRule, actions: {} })).toContain("actions: the rule would not change anything");
  });

  it("reports unknown fields instead of silently dropping them", () => {
    expect(errorsOf({ ...validRule, transform: "() => {}" })).toContain("transform: unknown field");
    expect(errorsOf({ ...validRule, match: { hosts: ["a.com"], regex: "x" } })).toContain("match.regex: unknown field");
  });

  it("accepts hasParams and trims the names", () => {
    const result = parseRule({ ...validRule, match: { hosts: ["a.com"], hasParams: [" v ", ""] } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.match.hasParams).toEqual(["v"]);
  });

  it("rejects hasParams that is not an array of strings", () => {
    expect(errorsOf({ ...validRule, match: { hosts: ["a.com"], hasParams: "v" } })).toContain(
      "match.hasParams: must be an array of strings",
    );
  });

  it("does not accept hasParams on its own as a site rule condition", () => {
    expect(errorsOf({ ...validRule, match: { hasParams: ["v"] } })).toContain(
      "match: needs at least one of hosts, hostPattern or pathPattern",
    );
  });

  it("rejects setParams whose values are not strings", () => {
    expect(errorsOf({ ...validRule, actions: { setParams: { v: 1 } } }).join()).toContain("actions.setParams");
  });
});

describe("parseRules", () => {
  it("rejects duplicate ids", () => {
    const result = parseRules([validRule, validRule]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join()).toContain('duplicate id "user.example"');
  });

  it("prefixes errors with the position of the offending rule", () => {
    const result = parseRules([validRule, { ...validRule, id: "user.other", name: "" }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("rule 2: name: required");
  });

  it("rejects anything that is not an array", () => {
    expect(parseRules(validRule).ok).toBe(false);
  });
});

describe("parseRulesJson", () => {
  it("round-trips an exported rule list", () => {
    const result = parseRulesJson(JSON.stringify([validRule]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0].id).toBe("user.example");
  });

  it("accepts a single rule object that is not wrapped in an array", () => {
    expect(parseRulesJson(JSON.stringify(validRule)).ok).toBe(true);
  });

  it("reports a syntax error rather than throwing", () => {
    const result = parseRulesJson("{ not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain("invalid JSON");
  });
});
