import {
  BUILTIN_ID_PREFIX,
  QUERY_MODES,
  RULE_SCOPES,
  type QueryMode,
  type RuleActions,
  type RuleMatch,
  type RuleScope,
  type UrlRule,
} from "../rules/types";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const RULE_KEYS = ["id", "name", "description", "scope", "match", "actions"];
const MATCH_KEYS = ["hosts", "hostPattern", "pathPattern", "hasParams"];
const ACTION_KEYS = ["setHost", "setPath", "queryMode", "queryParams", "setParams"];

/**
 * Patterns are compiled and run against every URL the user cleans, so a pasted rule is untrusted
 * input on a hot path. Catastrophic backtracking needs room to nest quantifiers; capping the source
 * length keeps a hand-written pattern comfortable while cutting off the crafted ones. The same
 * reasoning caps the size of an imported payload.
 */
const MAX_PATTERN_LENGTH = 500;
const MAX_RULES = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function unknownKeys(record: Record<string, unknown>, allowed: string[]): string[] {
  return Object.keys(record).filter((key) => !allowed.includes(key));
}

function checkPattern(pattern: string, field: string, errors: string[]): void {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    errors.push(`${field}: must be at most ${MAX_PATTERN_LENGTH} characters`);
    return;
  }
  try {
    new RegExp(pattern, "i");
  } catch (error) {
    errors.push(`${field}: not a valid regular expression (${(error as Error).message})`);
  }
}

function parseMatch(input: unknown, scope: RuleScope, errors: string[]): RuleMatch | undefined {
  if (!isRecord(input)) {
    errors.push("match: must be an object");
    return undefined;
  }

  for (const key of unknownKeys(input, MATCH_KEYS)) {
    errors.push(`match.${key}: unknown field`);
  }

  const match: RuleMatch = {};

  if (input.hosts !== undefined) {
    if (!isStringArray(input.hosts)) {
      errors.push("match.hosts: must be an array of strings");
    } else {
      const hosts = input.hosts.map((host) => host.trim().toLowerCase()).filter(Boolean);
      if (hosts.length > 0) match.hosts = hosts;
    }
  }

  for (const key of ["hostPattern", "pathPattern"] as const) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== "string") {
      errors.push(`match.${key}: must be a string`);
      continue;
    }
    if (value.length === 0) continue;
    checkPattern(value, `match.${key}`, errors);
    match[key] = value;
  }

  if (input.hasParams !== undefined) {
    if (!isStringArray(input.hasParams)) {
      errors.push("match.hasParams: must be an array of strings");
    } else {
      const params = input.hasParams.map((param) => param.trim()).filter(Boolean);
      if (params.length > 0) match.hasParams = params;
    }
  }

  // A `global` rule is allowed to match every URL — that is what makes it global. A `site` rule
  // without any condition would match everything too, shadowing every rule after it. `hasParams`
  // does not count here: on its own it would still match every host.
  if (scope === "site" && !match.hosts && !match.hostPattern && !match.pathPattern) {
    errors.push("match: needs at least one of hosts, hostPattern or pathPattern");
  }

  return match;
}

function parseActions(input: unknown, errors: string[]): RuleActions | undefined {
  if (!isRecord(input)) {
    errors.push("actions: must be an object");
    return undefined;
  }

  for (const key of unknownKeys(input, ACTION_KEYS)) {
    errors.push(`actions.${key}: unknown field`);
  }

  const actions: RuleActions = {};

  for (const key of ["setHost", "setPath"] as const) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== "string") {
      errors.push(`actions.${key}: must be a string`);
      continue;
    }
    if (value.length > 0) actions[key] = value;
  }

  if (input.queryMode !== undefined) {
    if (typeof input.queryMode !== "string" || !QUERY_MODES.includes(input.queryMode as QueryMode)) {
      errors.push(`actions.queryMode: must be one of ${QUERY_MODES.join(", ")}`);
    } else {
      actions.queryMode = input.queryMode as QueryMode;
    }
  }

  if (input.queryParams !== undefined) {
    if (!isStringArray(input.queryParams)) {
      errors.push("actions.queryParams: must be an array of strings");
    } else {
      const params = input.queryParams.map((param) => param.trim()).filter(Boolean);
      if (params.length > 0) actions.queryParams = params;
    }
  }

  if (input.setParams !== undefined) {
    if (!isRecord(input.setParams) || !Object.values(input.setParams).every((v) => typeof v === "string")) {
      errors.push("actions.setParams: must be an object mapping parameter names to strings");
    } else if (Object.keys(input.setParams).length > 0) {
      actions.setParams = input.setParams as Record<string, string>;
    }
  }

  if ((actions.queryMode === "keepOnly" || actions.queryMode === "remove") && !actions.queryParams) {
    errors.push(`actions.queryParams: required when queryMode is "${actions.queryMode}"`);
  }

  if (Object.keys(actions).length === 0) {
    errors.push("actions: the rule would not change anything");
  }

  return actions;
}

export interface ParseRuleOptions {
  /** Allows the reserved `builtin.` id prefix. Only the extension's own rule files should set this. */
  allowBuiltinIds?: boolean;
}

/** Validates one rule coming from a form, from imported JSON, or from the extension's own rule files. */
export function parseRule(input: unknown, options: ParseRuleOptions = {}): ParseResult<UrlRule> {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["rule: must be an object"] };
  }

  for (const key of unknownKeys(input, RULE_KEYS)) {
    errors.push(`${key}: unknown field`);
  }

  const id = typeof input.id === "string" ? input.id.trim() : "";
  if (!id) {
    errors.push("id: required");
  } else if (!options.allowBuiltinIds && id.startsWith(BUILTIN_ID_PREFIX)) {
    errors.push(`id: the "${BUILTIN_ID_PREFIX}" prefix is reserved for rules shipped with the extension`);
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) errors.push("name: required");

  let description: string | undefined;
  if (input.description !== undefined) {
    if (typeof input.description !== "string") {
      errors.push("description: must be a string");
    } else if (input.description.trim()) {
      description = input.description.trim();
    }
  }

  let scope: RuleScope | undefined;
  if (input.scope !== undefined) {
    if (typeof input.scope !== "string" || !RULE_SCOPES.includes(input.scope as RuleScope)) {
      errors.push(`scope: must be one of ${RULE_SCOPES.join(", ")}`);
    } else {
      scope = input.scope as RuleScope;
    }
  }

  const match = parseMatch(input.match ?? {}, scope ?? "site", errors);
  const actions = parseActions(input.actions ?? {}, errors);

  if (errors.length > 0 || !match || !actions) {
    return { ok: false, errors };
  }

  const rule: UrlRule = { id, name, match, actions };
  if (description) rule.description = description;
  if (scope) rule.scope = scope;
  return { ok: true, value: rule };
}

/** Validates a list of rules, e.g. a JSON payload the user is importing. Rejects duplicate ids. */
export function parseRules(input: unknown, options: ParseRuleOptions = {}): ParseResult<UrlRule[]> {
  if (!Array.isArray(input)) {
    return { ok: false, errors: ["expected an array of rules"] };
  }

  if (input.length > MAX_RULES) {
    return { ok: false, errors: [`too many rules: ${input.length} given, at most ${MAX_RULES} are accepted`] };
  }

  const errors: string[] = [];
  const rules: UrlRule[] = [];
  const seen = new Set<string>();

  input.forEach((entry, index) => {
    const result = parseRule(entry, options);
    if (!result.ok) {
      errors.push(...result.errors.map((error) => `rule ${index + 1}: ${error}`));
      return;
    }
    if (seen.has(result.value.id)) {
      errors.push(`rule ${index + 1}: duplicate id "${result.value.id}"`);
      return;
    }
    seen.add(result.value.id);
    rules.push(result.value);
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: rules };
}

/** Parses a JSON string into rules, reporting syntax errors the same way as validation errors. */
export function parseRulesJson(json: string, options: ParseRuleOptions = {}): ParseResult<UrlRule[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return { ok: false, errors: [`invalid JSON: ${(error as Error).message}`] };
  }
  // A single rule object is accepted too, so users can paste one rule without wrapping it in an array.
  return parseRules(Array.isArray(parsed) ? parsed : [parsed], options);
}
