import type { UrlRule } from "../rules/types";

export interface ImportSummary {
  /** One line per rule: its name and what it matches. */
  lines: string[];
  /**
   * Hosts that an imported rule would rewrite URLs to. Rewriting the host silently sends the user
   * somewhere other than the link they copied, so these are called out separately.
   */
  rewrittenHosts: string[];
  /** True when a rule matches every URL rather than a specific site. */
  hasGlobalRule: boolean;
}

/** Renders a rule's match conditions the same way the rule list does, for the confirmation dialog. */
function describeMatch(rule: UrlRule): string {
  const { hosts, hostPattern, pathPattern } = rule.match;
  const parts: string[] = [];
  if (hosts?.length) parts.push(hosts.join(", "));
  if (hostPattern) parts.push(`host =~ ${hostPattern}`);
  if (pathPattern) parts.push(`path =~ ${pathPattern}`);
  return parts.length > 0 ? parts.join(", ") : "every URL";
}

/**
 * Describes what a set of rules would do, so the user can see it before importing.
 *
 * Imported JSON comes from the clipboard, which means it can come from anywhere — a blog post, a
 * chat message, a page the user was asked to copy from. A rule is not code, but it does get applied
 * to every URL the user cleans afterwards, so it is shown rather than merged silently.
 */
export function summarizeImport(rules: UrlRule[]): ImportSummary {
  const rewrittenHosts: string[] = [];
  let hasGlobalRule = false;

  const lines = rules.map((rule) => {
    if (rule.actions.setHost && !rewrittenHosts.includes(rule.actions.setHost)) {
      rewrittenHosts.push(rule.actions.setHost);
    }
    if (!rule.match.hosts && !rule.match.hostPattern && !rule.match.pathPattern) {
      hasGlobalRule = true;
    }
    return `• ${rule.name} — ${describeMatch(rule)}`;
  });

  return { lines, rewrittenHosts, hasGlobalRule };
}

/** Builds the body of the import confirmation dialog. */
export function formatImportConfirmation(rules: UrlRule[]): string {
  const { lines, rewrittenHosts, hasGlobalRule } = summarizeImport(rules);
  const sections = [lines.join("\n")];

  if (rewrittenHosts.length > 0) {
    sections.push(
      `⚠️ Rewrites the host of matching URLs to: ${rewrittenHosts.join(", ")}. Only import this from a source you trust.`,
    );
  }
  if (hasGlobalRule) {
    sections.push("⚠️ Contains a rule that matches every URL, not just one site.");
  }
  sections.push("Rules with an id you already use will be replaced.");

  return sections.join("\n\n");
}
