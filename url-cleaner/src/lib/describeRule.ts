import type { UrlRule } from "../rules/types";

/**
 * One-line summary of what a rule matches, used by the rule list and by the import confirmation.
 *
 * `separator` is what goes between the conditions; the rule list uses a wider one because it has
 * the room, the confirmation dialog stays with the default comma.
 */
export function describeMatch(rule: UrlRule, separator = ", "): string {
  const { hosts, hostPattern, pathPattern } = rule.match;
  const parts: string[] = [];
  if (hosts?.length) parts.push(hosts.join(", "));
  if (hostPattern) parts.push(`host =~ ${hostPattern}`);
  if (pathPattern) parts.push(`path =~ ${pathPattern}`);
  return parts.length > 0 ? parts.join(separator) : "every URL";
}
