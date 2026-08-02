import { beforeEach, describe, expect, it } from "vitest";
import type { UrlRule } from "../rules/types";
// `@raycast/api` is aliased to this stub in vitest.config.ts, so the store reads and writes here.
import { localStorageContents as storage } from "../test/raycastApiStub";
import { builtinRules, defaultDisabledBuiltinRuleIds } from "../rules";
import {
  createUserRuleId,
  deleteUserRule,
  importUserRules,
  loadEnabledRules,
  loadRuleSet,
  resetToDefaults,
  saveUserRule,
  setRuleEnabled,
} from "./ruleStore";

/** How many built-in rules are on right after installing, i.e. all but the ship-disabled ones. */
const defaultEnabledBuiltinCount = builtinRules.length - defaultDisabledBuiltinRuleIds.length;

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
  it("lists every built-in rule, enabled apart from the ones that ship switched off", async () => {
    const { entries, enabledRules } = await loadRuleSet();
    expect(entries).toHaveLength(builtinRules.length);
    expect(entries.every((entry) => entry.isBuiltin)).toBe(true);
    expect(new Set(entries.filter((entry) => !entry.enabled).map((entry) => entry.rule.id))).toEqual(
      new Set(defaultDisabledBuiltinRuleIds),
    );
    expect(enabledRules).toHaveLength(defaultEnabledBuiltinCount);
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
    storage.set("seededDefaultDisabledRuleIds", "{not json");
    const { entries, enabledRules } = await loadRuleSet();
    expect(entries).toHaveLength(builtinRules.length);
    expect(enabledRules).toHaveLength(defaultEnabledBuiltinCount);
  });
});

describe("setRuleEnabled", () => {
  it("keeps a disabled rule out of the rules handed to the cleaner", async () => {
    await setRuleEnabled("builtin.amazon.product", false);

    const { entries } = await loadRuleSet();
    expect(entries.find((entry) => entry.rule.id === "builtin.amazon.product")?.enabled).toBe(false);

    const enabled = await loadEnabledRules();
    expect(enabled.some((rule) => rule.id === "builtin.amazon.product")).toBe(false);
    expect(enabled).toHaveLength(defaultEnabledBuiltinCount - 1);
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
    expect(entries.filter((entry) => entry.enabled)).toHaveLength(defaultEnabledBuiltinCount - 1);
  });
});

describe("rules that ship switched off", () => {
  const shortenId = "builtin.youtube.shorten";

  async function isEnabled(id: string): Promise<boolean> {
    const { entries } = await loadRuleSet();
    return entries.find((entry) => entry.rule.id === id)?.enabled === true;
  }

  it("switches the YouTube shortening rule off on a fresh install", async () => {
    expect(defaultDisabledBuiltinRuleIds).toContain(shortenId);
    expect(await isEnabled(shortenId)).toBe(false);

    const enabled = await loadEnabledRules();
    expect(enabled.some((rule) => rule.id === shortenId)).toBe(false);
  });

  it("keeps the rule on once the user enables it, across later loads", async () => {
    await loadRuleSet();
    await setRuleEnabled(shortenId, true);

    // Every later load — a new command run, an extension update, a Raycast restart — reads storage
    // again, and must not re-apply the default.
    expect(await isEnabled(shortenId)).toBe(true);
    expect(await isEnabled(shortenId)).toBe(true);
  });

  it("seeds the default only once, leaving no duplicate ids behind", async () => {
    await loadRuleSet();
    await loadRuleSet();
    expect(JSON.parse(storage.get("disabledRuleIds") ?? "[]")).toEqual([shortenId]);
    expect(JSON.parse(storage.get("seededDefaultDisabledRuleIds") ?? "[]")).toEqual([shortenId]);
  });

  it("switches the rule back off after a reset to defaults", async () => {
    await loadRuleSet();
    await setRuleEnabled(shortenId, true);
    expect(await isEnabled(shortenId)).toBe(true);

    await resetToDefaults();
    expect(await isEnabled(shortenId)).toBe(false);
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

  it("resets user rules and restores the built-in rules to their as-installed state", async () => {
    await saveUserRule(userRule);
    await setRuleEnabled("builtin.amazon.product", false);
    await resetToDefaults();

    const { entries, enabledRules } = await loadRuleSet();
    expect(entries).toHaveLength(builtinRules.length);
    expect(enabledRules).toHaveLength(defaultEnabledBuiltinCount);
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
});
