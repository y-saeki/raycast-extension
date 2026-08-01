import { builtinRules } from "../rules";
import type { UrlRule } from "../rules/types";
import { extractUrls } from "./extractUrls";
import { applyRules } from "./ruleEngine";

/**
 * Cleans a single URL string by running it through `rules`.
 * Returns the input unchanged when it is not a URL, or when no rule changed anything.
 */
export function cleanUrl(rawUrl: string, rules: UrlRule[] = builtinRules): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const before = url.toString();
  applyRules(url, rules);
  const after = url.toString();

  // Returning `rawUrl` keeps URLs that no rule touched byte-identical, so that
  // `new URL(...).toString()` normalization is never reported as a change.
  return after === before ? rawUrl : after;
}

export interface CleanTextResult {
  text: string;
  changed: boolean;
}

/** Finds every URL in free-form text and cleans it in place, leaving the rest of the text untouched. */
export function cleanText(text: string, rules: UrlRule[] = builtinRules): CleanTextResult {
  const found = extractUrls(text);
  if (found.length === 0) {
    return { text, changed: false };
  }

  let changed = false;
  let result = text;
  for (const { raw, trailing } of found) {
    const cleaned = cleanUrl(raw, rules);
    if (cleaned !== raw) {
      changed = true;
      result = result.replace(raw + trailing, cleaned + trailing);
    }
  }

  return { text: result, changed };
}
