import { LocalStorage } from "@raycast/api";
import { builtinRules, defaultDisabledBuiltinRuleIds } from "../rules";
import { USER_ID_PREFIX, isBuiltinRuleId, type UrlRule } from "../rules/types";
import { parseRules } from "./ruleSchema";

const USER_RULES_KEY = "userRules";
const DISABLED_RULE_IDS_KEY = "disabledRuleIds";
const SEEDED_DEFAULT_DISABLED_KEY = "seededDefaultDisabledRuleIds";

export interface RuleListEntry {
  rule: UrlRule;
  isBuiltin: boolean;
  enabled: boolean;
}

export interface RuleSet {
  /** User rules first, then built-in rules — the same order the engine evaluates them in. */
  entries: RuleListEntry[];
  /** Just the enabled rules, ready to hand to `cleanUrl` / `cleanText`. */
  enabledRules: UrlRule[];
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt storage should never take the extension down; fall back to defaults.
    return fallback;
  }
}

/** Reads the user's own rules, dropping any that no longer pass validation. */
export async function loadUserRules(): Promise<UrlRule[]> {
  const stored = await readJson<unknown>(USER_RULES_KEY, []);
  const result = parseRules(stored);
  return result.ok ? result.value : [];
}

/** Reads a stored array of rule ids, ignoring anything in it that is not a string. */
async function readRuleIds(key: string): Promise<Set<string>> {
  const stored = await readJson<unknown>(key, []);
  return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
}

async function loadDisabledRuleIds(): Promise<Set<string>> {
  return readRuleIds(DISABLED_RULE_IDS_KEY);
}

/**
 * Applies the ship-disabled default to every rule in `defaultDisabledBuiltinRuleIds` whose id has
 * not been seeded yet, and records that it has now been seeded.
 *
 * Seeding is keyed on the rule id rather than a schema version, so each rule is switched off exactly
 * once, the first time the extension sees it. Enabling such a rule therefore sticks: its id stays in
 * the seeded list, so the default is never applied a second time.
 */
async function seedDefaultDisabledRuleIds(disabledIds: Set<string>): Promise<Set<string>> {
  const seededIds = await readRuleIds(SEEDED_DEFAULT_DISABLED_KEY);
  const pending = defaultDisabledBuiltinRuleIds.filter((id) => !seededIds.has(id));
  if (pending.length === 0) return disabledIds;

  for (const id of pending) {
    disabledIds.add(id);
    seededIds.add(id);
  }

  await Promise.all([
    LocalStorage.setItem(DISABLED_RULE_IDS_KEY, JSON.stringify(Array.from(disabledIds))),
    LocalStorage.setItem(SEEDED_DEFAULT_DISABLED_KEY, JSON.stringify(Array.from(seededIds))),
  ]);
  return disabledIds;
}

/**
 * Loads every rule with its enabled state.
 *
 * Disabled ids are what gets persisted (rather than enabled ids), so built-in rules added by a future
 * version of the extension are enabled by default instead of silently staying off. Rules that should
 * ship switched off are the exception, handled by `seedDefaultDisabledRuleIds`.
 */
export async function loadRuleSet(): Promise<RuleSet> {
  const [userRules, storedDisabledIds] = await Promise.all([loadUserRules(), loadDisabledRuleIds()]);
  const disabledIds = await seedDefaultDisabledRuleIds(storedDisabledIds);

  const entries: RuleListEntry[] = [
    ...userRules.map((rule) => ({ rule, isBuiltin: false, enabled: !disabledIds.has(rule.id) })),
    ...builtinRules.map((rule) => ({ rule, isBuiltin: true, enabled: !disabledIds.has(rule.id) })),
  ];

  return { entries, enabledRules: entries.filter((entry) => entry.enabled).map((entry) => entry.rule) };
}

/** Loads only the rules the cleaning command should run. */
export async function loadEnabledRules(): Promise<UrlRule[]> {
  const { enabledRules } = await loadRuleSet();
  return enabledRules;
}

export async function setRuleEnabled(id: string, enabled: boolean): Promise<void> {
  const disabledIds = await loadDisabledRuleIds();
  if (enabled) {
    disabledIds.delete(id);
  } else {
    disabledIds.add(id);
  }
  await LocalStorage.setItem(DISABLED_RULE_IDS_KEY, JSON.stringify(Array.from(disabledIds)));
}

async function writeUserRules(rules: UrlRule[]): Promise<void> {
  await LocalStorage.setItem(USER_RULES_KEY, JSON.stringify(rules));
}

/** Adds a new user rule, or replaces the existing one with the same id. */
export async function saveUserRule(rule: UrlRule): Promise<void> {
  const rules = await loadUserRules();
  const index = rules.findIndex((existing) => existing.id === rule.id);
  if (index >= 0) {
    rules[index] = rule;
  } else {
    rules.push(rule);
  }
  await writeUserRules(rules);
}

export async function deleteUserRule(id: string): Promise<void> {
  const rules = await loadUserRules();
  await writeUserRules(rules.filter((rule) => rule.id !== id));

  const disabledIds = await loadDisabledRuleIds();
  if (disabledIds.delete(id)) {
    await LocalStorage.setItem(DISABLED_RULE_IDS_KEY, JSON.stringify(Array.from(disabledIds)));
  }
}

/**
 * Merges imported rules into the user's rules. Rules whose id already exists are replaced,
 * so re-importing an export does not create duplicates. Returns how many were added vs replaced.
 */
export async function importUserRules(imported: UrlRule[]): Promise<{ added: number; replaced: number }> {
  const rules = await loadUserRules();
  let added = 0;
  let replaced = 0;

  for (const rule of imported) {
    const index = rules.findIndex((existing) => existing.id === rule.id);
    if (index >= 0) {
      rules[index] = rule;
      replaced += 1;
    } else {
      rules.push(rule);
      added += 1;
    }
  }

  await writeUserRules(rules);
  return { added, replaced };
}

/**
 * Removes every user rule and restores the built-in rules to their as-installed state. Clearing the
 * seeded ids means the next load switches the ship-disabled rules back off.
 */
export async function resetToDefaults(): Promise<void> {
  await LocalStorage.removeItem(USER_RULES_KEY);
  await LocalStorage.removeItem(DISABLED_RULE_IDS_KEY);
  await LocalStorage.removeItem(SEEDED_DEFAULT_DISABLED_KEY);
}

/** Builds a stable, unique id for a rule the user just created. */
export function createUserRuleId(name: string, existingIds: string[] = []): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "rule";

  let id = `${USER_ID_PREFIX}${slug}`;
  let suffix = 2;
  while (existingIds.includes(id)) {
    id = `${USER_ID_PREFIX}${slug}-${suffix}`;
    suffix += 1;
  }
  return id;
}

/** Builds the name a duplicated rule starts out with, before the user edits it. */
export function duplicateRuleName(name: string): string {
  return `${name} (Copy)`;
}

export { isBuiltinRuleId };
