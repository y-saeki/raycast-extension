import { extractUrls } from "./extractUrls";
import { stripGenericTrackingParams } from "./genericTrackingParams";
import { findRule } from "./rules";

/** Cleans a single URL string: applies a matching site rule (if any), then strips generic tracking params. */
export function cleanUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  findRule(url)?.transform(url);
  stripGenericTrackingParams(url);

  return url.toString();
}

export interface CleanTextResult {
  text: string;
  changed: boolean;
}

/** Finds every URL in free-form text and cleans it in place, leaving the rest of the text untouched. */
export function cleanText(text: string): CleanTextResult {
  const found = extractUrls(text);
  if (found.length === 0) {
    return { text, changed: false };
  }

  let changed = false;
  let result = text;
  for (const { raw, trailing } of found) {
    const cleaned = cleanUrl(raw);
    if (cleaned !== raw) {
      changed = true;
      result = result.replace(raw + trailing, cleaned + trailing);
    }
  }

  return { text: result, changed };
}
