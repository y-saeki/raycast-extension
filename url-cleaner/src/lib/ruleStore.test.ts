import { beforeEach, describe, expect, it } from "vitest";
import type { UrlRule } from "../rules/types";
// `@raycast/api` is aliased to this stub in vitest.config.ts, so the store reads and writes here.
import { localStorageContents as storage } from "../test/raycastApiStub";
import { builtinRules } from "../rules";
import {
  createUserRuleId,
  deleteUserRule,
  duplicateRuleName,
  importUserRules,
  loadEnabledRules,
  loadRuleSet,
  resetToDefaults,
  saveUserRule,
  setRuleEnabled,
} from "./ruleStore";

const userRule: UrlRule = {
  id: "user.example",
  name: "Example",
  match: { hosts: ["example.com"] },
  actions: { queryMode: "removeAll" },
};

beforeEach(() => {
  storage.clear();
});

describe("loadRuleSet", () => {
  it("returns every built-in rule enabled by default", async () => {
    const { entries, enabledRules } = await loadRuleSet();
    expect(entries).toHaveLength(builtinRules.length);
    expect(entries.every((entry) => entry.isBuiltin && entry.enabled)).toBe(true);
    expect(enabledRules).toHaveLength(builtinRules.length);
  });

  it("lists user rules before built-in rules, so they can override them", async () => {
    await saveUserRule(userRule);
    const { entries } = await loadRuleSet();
    expect(entries[0].rule.id).toBe("user.example");
    expect(entries[0].isBuiltin).toBe(false);
  });

  it("ignores stored rules that no longer pass validation", async () => {
    storage.set("userRules", JSON.stringify([{ id: "user.broken" }]));
    const { entries } = await loadRuleSet();
    expect(entries.every((entry) => entry.isBuiltin)).toBe(true);
  });

  it("falls back to the built-in rules when storage is corrupt", async () => {
    storage.set("userRules", "{not json");
    storage.set("disabledRuleIds", "{not json");
    const { entries } = await loadRuleSet();
    expect(entries).toHaveLength(builtinRules.length);
  });
});

describe("setRuleEnabled", () => {
  it("keeps a disabled rule out of the rules handed to the cleaner", async () => {
    await setRuleEnabled("builtin.amazon.product", false);

    const { entries } = await loadRuleSet();
    expect(entries.find((entry) => entry.rule.id === "builtin.amazon.product")?.enabled).toBe(false);

    const enabled = await loadEnabledRules();
    expect(enabled.some((rule) => rule.id === "builtin.amazon.product")).toBe(false);
    expect(enabled).toHaveLength(builtinRules.length - 1);
  });

  it("re-enables a rule", async () => {
    await setRuleEnabled("builtin.amazon.product", false);
    await setRuleEnabled("builtin.amazon.product", true);
    const enabled = await loadEnabledRules();
    expect(enabled.some((rule) => rule.id === "builtin.amazon.product")).toBe(true);
  });

  it("stores disabled ids, so a built-in rule added later is enabled by default", async () => {
    await setRuleEnabled("builtin.amazon.product", false);
    expect(JSON.parse(storage.get("disabledRuleIds") ?? "[]")).toEqual(["builtin.amazon.product"]);

    // Simulating a future version: an id nobody has ever seen is not in the disabled list.
    const { entries } = await loadRuleSet();
    expect(entries.filter((entry) => entry.enabled)).toHaveLength(builtinRules.length - 1);
  });
});

describe("user rules", () => {
  it("replaces a rule that has the same id instead of duplicating it", async () => {
    await saveUserRule(userRule);
    await saveUserRule({ ...userRule, name: "Renamed" });
    const { entries } = await loadRuleSet();
    const mine = entries.filter((entry) => !entry.isBuiltin);
    expect(mine).toHaveLength(1);
    expect(mine[0].rule.name).toBe("Renamed");
  });

  it("deletes a rule together with its disabled state", async () => {
    await saveUserRule(userRule);
    await setRuleEnabled(userRule.id, false);
    await deleteUserRule(userRule.id);

    expect(JSON.parse(storage.get("disabledRuleIds") ?? "[]")).toEqual([]);
    const { entries } = await loadRuleSet();
    expect(entries.every((entry) => entry.isBuiltin)).toBe(true);
  });

  it("re-importing an export replaces rules rather than duplicating them", async () => {
    expect(await importUserRules([userRule])).toEqual({ added: 1, replaced: 0 });
    expect(await importUserRules([userRule])).toEqual({ added: 0, replaced: 1 });

    const { entries } = await loadRuleSet();
    expect(entries.filter((entry) => !entry.isBuiltin)).toHaveLength(1);
  });

  it("resets user rules and re-enables every built-in rule", async () => {
    await saveUserRule(userRule);
    await setRuleEnabled("builtin.amazon.product", false);
    await resetToDefaults();

    const { entries, enabledRules } = await loadRuleSet();
    expect(entries).toHaveLength(builtinRules.length);
    expect(enabledRules).toHaveLength(builtinRules.length);
  });
});

describe("createUserRuleId", () => {
  it("builds a slug from the rule name", () => {
    expect(createUserRuleId("Note — drop referrer")).toBe("user.note-drop-referrer");
  });

  it("falls back to a generic id when the name has nothing to slugify", () => {
    expect(createUserRuleId("日本語")).toBe("user.rule");
  });

  it("avoids ids that are already taken", () => {
    expect(createUserRuleId("Example", ["user.example"])).toBe("user.example-2");
    expect(createUserRuleId("Example", ["user.example", "user.example-2"])).toBe("user.example-3");
  });

  it("gives a duplicated rule an id of its own", () => {
    const name = duplicateRuleName("Amazon: product URL");
    expect(createUserRuleId(name, ["user.amazon-product-url"])).toBe("user.amazon-product-url-copy");
  });
});

describe("duplicateRuleName", () => {
  it("marks the name as a copy", () => {
    expect(duplicateRuleName("Amazon: product URL")).toBe("Amazon: product URL (Copy)");
  });
});
