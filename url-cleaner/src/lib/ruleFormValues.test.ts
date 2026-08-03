import { describe, expect, it } from "vitest";
import type { UrlRule } from "../rules/types";
import { EMPTY_VALUES, fieldErrorsFor, formValuesToRule, ruleToFormValues } from "./ruleFormValues";

describe("ruleToFormValues", () => {
  it("renders lists and set params as the strings the form holds", () => {
    const rule: UrlRule = {
      id: "user.test",
      name: "Test",
      match: { hosts: ["a.example", "b.example"], hasParams: ["v"] },
      actions: { queryMode: "keepOnly", queryParams: ["t", "list"], setParams: { v: "$1", t: "0" } },
    };

    expect(ruleToFormValues(rule)).toMatchObject({
      hosts: "a.example, b.example",
      hasParams: "v",
      queryParams: "t, list",
      setParams: "v=$1\nt=0",
      testUrl: "",
    });
  });

  it("falls back to the defaults for the fields a rule may omit", () => {
    const rule: UrlRule = {
      id: "user.test",
      name: "Test",
      match: { hosts: ["a.example"] },
      actions: { queryMode: "removeAll" },
    };

    expect(ruleToFormValues(rule)).toMatchObject({ description: "", scope: "site", hostPattern: "", setHost: "" });
  });
});

describe("formValuesToRule", () => {
  const base = { ...EMPTY_VALUES, name: "Test", hosts: "Example.com", queryMode: "removeAll" as const };

  it("builds a rule from the form values", () => {
    const result = formValuesToRule(base, "user.test");
    expect(result).toEqual({
      ok: true,
      value: { id: "user.test", name: "Test", match: { hosts: ["example.com"] }, actions: { queryMode: "removeAll" } },
    });
  });

  it("leaves out the site scope and the keepAll query mode, which are the defaults", () => {
    const result = formValuesToRule(
      { ...base, scope: "site", queryMode: "keepAll", setHost: "a.example" },
      "user.test",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scope).toBeUndefined();
    expect(result.value.actions.queryMode).toBeUndefined();
  });

  it("keeps a global scope", () => {
    const result = formValuesToRule({ ...base, scope: "global", hosts: "" }, "user.test");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scope).toBe("global");
  });

  it("reports a set params line that is not in key=value form", () => {
    const result = formValuesToRule({ ...base, setParams: "v" }, "user.test");
    expect(result).toEqual({ ok: false, errors: ['actions.setParams: "v" is not in key=value form'] });
  });

  it("reports the rule's own validation errors", () => {
    const result = formValuesToRule({ ...base, name: "", hostPattern: "(" }, "user.test");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("name: required");
    expect(result.errors.some((error) => error.startsWith("match.hostPattern:"))).toBe(true);
  });

  it("round-trips a rule through the form values", () => {
    const rule: UrlRule = {
      id: "user.test",
      name: "Test",
      description: "A test rule",
      scope: "global",
      match: { hosts: ["example.com"], pathPattern: "^/p/(\\d+)", hasParams: ["v"] },
      actions: { setHost: "short.example", setPath: "/$1", queryMode: "keepOnly", queryParams: ["t"] },
    };

    expect(formValuesToRule(ruleToFormValues(rule), rule.id)).toEqual({ ok: true, value: rule });
  });
});

describe("fieldErrorsFor", () => {
  it("assigns each error to its field, without the prefix", () => {
    expect(fieldErrorsFor(["name: required", 'actions.queryParams: required when queryMode is "remove"'])).toEqual({
      name: "required",
      queryParams: 'required when queryMode is "remove"',
    });
  });

  it("shows a whole-match error on the hosts field, which is the first one of the group", () => {
    expect(fieldErrorsFor(["match: needs at least one of hosts, hostPattern or pathPattern"])).toEqual({
      hosts: "needs at least one of hosts, hostPattern or pathPattern",
    });
  });

  it("drops an error that belongs to no field", () => {
    expect(fieldErrorsFor(["id: required"])).toEqual({});
  });
});
