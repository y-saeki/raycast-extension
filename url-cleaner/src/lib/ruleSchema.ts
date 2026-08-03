import {
  BUILTIN_ID_PREFIX,
  QUERY_MODES,
  RULE_SCOPES,
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

/**
 * Reads a list of strings, trimming the entries and dropping the empty ones.
 * Returns undefined when the field is absent, invalid, or left nothing behind — in each case the
 * field is simply not carried over to the parsed rule.
 */
function parseStringList(
  value: unknown,
  field: string,
  errors: string[],
  options: { lowercase?: boolean } = {},
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!isStringArray(value)) {
    errors.push(`${field}: must be an array of strings`);
    return undefined;
  }
  const entries = value.map((entry) => (options.lowercase ? entry.trim().toLowerCase() : entry.trim())).filter(Boolean);
  return entries.length > 0 ? entries : undefined;
}

/** Reads an optional string, treating an empty one as absent. */
function parseOptionalString(value: unknown, field: string, errors: string[]): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    errors.push(`${field}: must be a string`);
    return undefined;
  }
  return value.length > 0 ? value : undefined;
}

/** Reads a regular expression source, rejecting one that is too long or does not compile. */
function parsePattern(value: unknown, field: string, errors: string[]): string | undefined {
  const pattern = parseOptionalString(value, field, errors);
  if (pattern === undefined) return undefined;

  if (pattern.length > MAX_PATTERN_LENGTH) {
    errors.push(`${field}: must be at most ${MAX_PATTERN_LENGTH} characters`);
    return pattern;
  }
  try {
    new RegExp(pattern, "i");
  } catch (error) {
    errors.push(`${field}: not a valid regular expression (${(error as Error).message})`);
  }
  return pattern;
}

/** Reads a value that has to be one of `allowed`. */
function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  errors: string[],
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    errors.push(`${field}: must be one of ${allowed.join(", ")}`);
    return undefined;
  }
  return value as T;
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

  const hosts = parseStringList(input.hosts, "match.hosts", errors, { lowercase: true });
  const hostPattern = parsePattern(input.hostPattern, "match.hostPattern", errors);
  const pathPattern = parsePattern(input.pathPattern, "match.pathPattern", errors);
  const hasParams = parseStringList(input.hasParams, "match.hasParams", errors);

  if (hosts) match.hosts = hosts;
  if (hostPattern) match.hostPattern = hostPattern;
  if (pathPattern) match.pathPattern = pathPattern;
  if (hasParams) match.hasParams = hasParams;

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

  const setHost = parseOptionalString(input.setHost, "actions.setHost", errors);
  const setPath = parseOptionalString(input.setPath, "actions.setPath", errors);
  const queryMode = parseEnum(input.queryMode, QUERY_MODES, "actions.queryMode", errors);
  const queryParams = parseStringList(input.queryParams, "actions.queryParams", errors);

  if (setHost) actions.setHost = setHost;
  if (setPath) actions.setPath = setPath;
  if (queryMode) actions.queryMode = queryMode;
  if (queryParams) actions.queryParams = queryParams;

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

  const scope = parseEnum(input.scope, RULE_SCOPES, "scope", errors);

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
