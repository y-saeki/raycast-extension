import type { RuleActions, UrlRule } from "../rules/types";

/**
 * Captures from `match.pathPattern`, indexed the way `String.prototype.match` returns them
 * (`[0]` is the whole match). An empty array means the rule matched without a `pathPattern`.
 */
export type PathCaptures = string[];

const CAPTURE_REFERENCE = /\$(\d+)/g;
const PARAM_REFERENCE = /\$\{([^}]*)\}/g;

/** Compiles a user-supplied pattern, returning undefined when it is not a valid regular expression. */
function compilePattern(pattern: string): RegExp | undefined {
  try {
    return new RegExp(pattern, "i");
  } catch {
    return undefined;
  }
}

function hostnameIs(hostname: string, base: string): boolean {
  const normalized = base.toLowerCase();
  return hostname === normalized || hostname.endsWith(`.${normalized}`);
}

/**
 * Replaces `${name}` with the value of the query parameter `name`, and `$1`, `$2`, ... with the
 * corresponding path capture. References that resolve to nothing are left as-is.
 */
function interpolate(template: string, captures: PathCaptures, params: URLSearchParams): string {
  return template
    .replace(PARAM_REFERENCE, (whole, name: string) => params.get(name) ?? whole)
    .replace(CAPTURE_REFERENCE, (whole, index: string) => captures[Number(index)] ?? whole);
}

/**
 * Checks a rule's `match` against a URL.
 * Returns the path captures when it matches, or undefined when it does not.
 * A rule with an invalid regular expression never matches.
 */
export function matchRule(rule: UrlRule, url: URL): PathCaptures | undefined {
  const { hosts, hostPattern, pathPattern, hasParams } = rule.match;

  if (hosts && hosts.length > 0 && !hosts.some((host) => hostnameIs(url.hostname, host))) {
    return undefined;
  }

  if (hostPattern) {
    const regex = compilePattern(hostPattern);
    if (!regex || !regex.test(url.hostname)) return undefined;
  }

  if (hasParams && !hasParams.every((param) => url.searchParams.has(param))) {
    return undefined;
  }

  if (pathPattern) {
    const regex = compilePattern(pathPattern);
    if (!regex) return undefined;
    return url.pathname.match(regex) ?? undefined;
  }

  return [];
}

/**
 * Rebuilds the query string according to the rule's query actions.
 * Leaves `url.search` completely untouched when the actions would not change any parameter,
 * so that URLs we do not need to modify keep their original encoding.
 */
function applyQueryActions(url: URL, actions: RuleActions, captures: PathCaptures, params: URLSearchParams): void {
  const mode = actions.queryMode ?? "keepAll";
  const listed = new Set(actions.queryParams ?? []);
  const setParams = actions.setParams ?? {};

  const entries = Array.from(url.searchParams.entries());
  const kept =
    mode === "removeAll"
      ? []
      : entries.filter(([key]) =>
          mode === "keepAll" ? true : mode === "keepOnly" ? listed.has(key) : !listed.has(key),
        );

  const removedAny = kept.length !== entries.length;
  const setsAny = Object.keys(setParams).length > 0;
  if (!removedAny && !setsAny) return;

  // `setParams` is written first so explicitly set parameters lead the resulting query string.
  const rebuilt = new URLSearchParams();
  for (const [key, template] of Object.entries(setParams)) {
    rebuilt.set(key, interpolate(template, captures, params));
  }
  for (const [key, value] of kept) {
    if (!rebuilt.has(key)) rebuilt.append(key, value);
  }

  url.search = rebuilt.toString();
}

/** Applies a matched rule's actions to `url`, mutating it in place. */
export function applyRule(rule: UrlRule, url: URL, captures: PathCaptures): void {
  const { actions } = rule;

  // Snapshot the query before any action runs, so `${name}` references always see the incoming URL
  // even when the same rule goes on to drop the parameter it read.
  const params = new URLSearchParams(url.search);

  if (actions.setHost) {
    url.hostname = interpolate(actions.setHost, captures, params);
  }
  if (actions.setPath) {
    url.pathname = interpolate(actions.setPath, captures, params);
  }
  if (actions.queryMode !== undefined || actions.setParams !== undefined) {
    applyQueryActions(url, actions, captures, params);
  }
}

/**
 * Runs `rules` against `url`, mutating it in place.
 *
 * The first matching `site` rule wins, then every matching `global` rule is applied.
 * Returns whether any rule matched.
 */
export function applyRules(url: URL, rules: UrlRule[]): boolean {
  /** Applies the rule when it matches, reporting whether it did. */
  function tryApply(rule: UrlRule): boolean {
    const captures = matchRule(rule, url);
    if (!captures) return false;
    applyRule(rule, url, captures);
    return true;
  }

  let matched = false;

  // Only the first matching site rule runs.
  for (const rule of rules) {
    if ((rule.scope ?? "site") === "site" && tryApply(rule)) {
      matched = true;
      break;
    }
  }

  // Every matching global rule runs, on the result of the site rule above.
  for (const rule of rules) {
    if (rule.scope === "global" && tryApply(rule)) matched = true;
  }

  return matched;
}
