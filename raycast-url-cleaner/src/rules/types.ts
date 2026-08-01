/**
 * The declarative rule schema shared by built-in and user-defined rules.
 *
 * Every rule must be plain JSON data — no functions — so that users can create rules
 * from the settings UI, and import/export them as JSON.
 */

/** Conditions a URL must satisfy for a rule to apply. All present conditions must match. */
export interface RuleMatch {
  /** Host suffixes. Matches when hostname === entry, or hostname ends with "." + entry. */
  hosts?: string[];
  /** Regular expression source tested against `url.hostname`. Always compiled case-insensitively. */
  hostPattern?: string;
  /**
   * Regular expression source tested against `url.pathname`. Always compiled case-insensitively.
   * Capture groups are available to the actions as `$1`, `$2`, ...
   */
  pathPattern?: string;
  /**
   * Query parameter names that must all be present. Their values are available to the actions
   * as `${name}`. Only meaningful together with a host or path condition on `site` rules.
   */
  hasParams?: string[];
}

/**
 * How the query string is treated.
 * - `keepAll`: leave every parameter alone (default)
 * - `removeAll`: drop every parameter
 * - `keepOnly`: keep only the parameters listed in `queryParams`
 * - `remove`: drop only the parameters listed in `queryParams`
 */
export type QueryMode = "keepAll" | "removeAll" | "keepOnly" | "remove";

export const QUERY_MODES: QueryMode[] = ["keepAll", "removeAll", "keepOnly", "remove"];

/**
 * What a rule does to a URL once it matches.
 *
 * Values marked as supporting references may contain `$1`, `$2`, ... for capture groups from
 * `match.pathPattern`, and `${name}` for the value of the query parameter `name`. References that
 * resolve to nothing are left in the value as written.
 */
export interface RuleActions {
  /** Replaces the hostname. Supports `$1` and `${name}` references. */
  setHost?: string;
  /** Replaces the path. Supports `$1` and `${name}` references. */
  setPath?: string;
  /** Defaults to `keepAll`. */
  queryMode?: QueryMode;
  /** Parameter names used by the `keepOnly` and `remove` query modes. */
  queryParams?: string[];
  /**
   * Parameters set explicitly, e.g. `{ v: "$1" }`. Values support `$1` and `${name}` references.
   * These are written first, so they lead the resulting query string.
   */
  setParams?: Record<string, string>;
}

/**
 * When a rule runs.
 * - `site`: site-specific. Only the first matching site rule is applied.
 * - `global`: runs after the site stage, and every matching global rule is applied.
 */
export type RuleStage = "site" | "global";

export const RULE_STAGES: RuleStage[] = ["site", "global"];

export interface UrlRule {
  /** Stable identifier. Built-in rules use the reserved `builtin.` prefix. */
  id: string;
  name: string;
  description?: string;
  /** Defaults to `site`. */
  stage?: RuleStage;
  match: RuleMatch;
  actions: RuleActions;
}

/** The `id` prefix reserved for rules shipped with the extension. */
export const BUILTIN_ID_PREFIX = "builtin.";

/** The `id` prefix used for rules the user created. */
export const USER_ID_PREFIX = "user.";

export function isBuiltinRuleId(id: string): boolean {
  return id.startsWith(BUILTIN_ID_PREFIX);
}
