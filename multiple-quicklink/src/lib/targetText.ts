import { parseTarget, type ParseResult } from "./linkSchema";
import { type QuicklinkTarget } from "./types";

/**
 * Targets are edited as text, one per line, so the whole list can be reordered by moving lines
 * around instead of walking a sub-screen per entry:
 *
 *     https://example.com
 *     https://example.com | Google Chrome
 *     /Users/me/projects/foo
 *     raycast://extensions/raycast/raycast/confetti
 *
 * Everything after the separator names the application to open the link with.
 */
export const APPLICATION_SEPARATOR = "|";

/**
 * Splits on the *last* separator: a link may legitimately contain `|` — unencoded in a query string,
 * or in a deeplink's JSON arguments — while an application name never does.
 */
function splitLine(line: string): { link: string; application: string } {
  const separator = line.lastIndexOf(APPLICATION_SEPARATOR);
  if (separator < 0) return { link: line.trim(), application: "" };
  return { link: line.slice(0, separator).trim(), application: line.slice(separator + 1).trim() };
}

/** Parses the targets field. Blank lines are ignored so a stray newline is not an error. */
export function parseTargetText(text: string): ParseResult<QuicklinkTarget[]> {
  const targets: QuicklinkTarget[] = [];
  const errors: string[] = [];
  let lineNumber = 0;

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    lineNumber += 1;

    const { link, application } = splitLine(line);
    const result = parseTarget({ link, application }, `targets: line ${lineNumber}`);
    if (result.ok) {
      targets.push(result.value);
    } else {
      errors.push(...result.errors);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  if (targets.length === 0) return { ok: false, errors: ["targets: add at least one link"] };
  return { ok: true, value: targets };
}

/** Renders targets back into the text form, so editing a saved set round-trips. */
export function formatTargetText(targets: QuicklinkTarget[]): string {
  return targets
    .map((target) =>
      target.application ? `${target.link} ${APPLICATION_SEPARATOR} ${target.application}` : target.link,
    )
    .join("\n");
}
