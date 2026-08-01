const URL_PATTERN = /\bhttps?:\/\/[^\s<>"'\]\)]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

export interface ExtractedUrl {
  /** The URL substring as it should be matched/replaced in the original text. */
  raw: string;
  /** Trailing punctuation stripped off `raw` because it's likely sentence punctuation, not part of the URL. */
  trailing: string;
}

/** Finds all http(s) URLs in free-form text, trimming likely sentence-trailing punctuation. */
export function extractUrls(text: string): ExtractedUrl[] {
  const matches = text.match(URL_PATTERN) ?? [];
  return matches.map((match) => {
    const trailingMatch = match.match(TRAILING_PUNCTUATION);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const raw = trailing ? match.slice(0, match.length - trailing.length) : match;
    return { raw, trailing };
  });
}
