import type { RuleActions, UrlRule } from "../rules/types";

/**
 * Captures from `match.pathPattern`, indexed the way `String.prototype.match` returns them
 * (`[0]` is the whole match). An empty array means the rule matched without a `pathPattern`.
 */
export type PathCaptures = string[];

const CAPTURE_REFERENCE = /\$(\d+)/g;

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

/** Replaces `$1`, `$2`, ... with the corresponding path capture, leaving unmatched references as-is. */
function interpolate(template: string, captures: PathCaptures): string {
  return template.replace(CAPTURE_REFERENCE, (whole, index: string) => captures[Number(index)] ?? whole);
}

/**
 * Checks a rule's `match` against a URL.
 * Returns the path captures when it matches, or undefined when it does not.
 * A rule with an invalid regular expression never matches.
 */
export function matchRule(rule: UrlRule, url: URL): PathCaptures | undefined {
  const { hosts, hostPattern, pathPattern } = rule.match;

  if (hosts && hosts.length > 0 && !hosts.some((host) => hostnameIs(url.hostname, host))) {
    return undefined;
  }

  if (hostPattern) {
    const regex = compilePattern(hostPattern);
    if (!regex || !regex.test(url.hostname)) return undefined;
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
function applyQueryActions(url: URL, actions: RuleActions, captures: PathCaptures): void {
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
    rebuilt.set(key, interpolate(template, captures));
  }
  for (const [key, value] of kept) {
    if (!rebuilt.has(key)) rebuilt.append(key, value);
  }

  url.search = rebuilt.toString();
}

/** Applies a matched rule's actions to `url`, mutating it in place. */
export function applyRule(rule: UrlRule, url: URL, captures: PathCaptures): void {
  const { actions } = rule;

  if (actions.setHost) {
    url.hostname = interpolate(actions.setHost, captures);
  }
  if (actions.setPath) {
    url.pathname = interpolate(actions.setPath, captures);
  }
  if (actions.queryMode !== undefined || actions.setParams !== undefined) {
    applyQueryActions(url, actions, captures);
  }
}

/**
 * Runs `rules` against `url`, mutating it in place.
 *
 * The first matching `site` rule wins, then every matching `global` rule is applied.
 * Returns whether any rule matched.
 */
export function applyRules(url: URL, rules: UrlRule[]): boolean {
  let matched = false;

  for (const rule of rules) {
    if ((rule.stage ?? "site") !== "site") continue;
    const captures = matchRule(rule, url);
    if (!captures) continue;
    applyRule(rule, url, captures);
    matched = true;
    break;
  }

  for (const rule of rules) {
    if (rule.stage !== "global") continue;
    const captures = matchRule(rule, url);
    if (!captures) continue;
    applyRule(rule, url, captures);
    matched = true;
  }

  return matched;
}
