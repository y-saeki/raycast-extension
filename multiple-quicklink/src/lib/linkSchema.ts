import { homedir } from "node:os";
import { type LinkKind, type MultipleQuicklink, type QuicklinkTarget } from "./types";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/**
 * Opening a set is one keystroke, so a set that grew by accident — a whole bookmark export pasted
 * into the targets field — would flood the desktop with windows before anyone could stop it. The cap
 * is well above what a working set needs and low enough that hitting it is a mistake worth catching.
 */
export const MAX_TARGETS_PER_SET = 20;
export const MAX_SETS = 200;
export const MAX_NAME_LENGTH = 100;

const DEEPLINK_PREFIX = "raycast://";
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const WINDOWS_PATH_PATTERN = /^[a-z]:[\\/]/i;

function isAbsolutePath(link: string): boolean {
  return link.startsWith("/") || link.startsWith("~/") || link === "~" || WINDOWS_PATH_PATTERN.test(link);
}

/**
 * Sorts a link into the three kinds the extension talks about. Everything reaches `open()` the same
 * way; the kind only drives the wording in the list and in error messages.
 */
export function classifyLink(link: string): LinkKind | undefined {
  if (link.startsWith(DEEPLINK_PREFIX)) return "deeplink";
  if (SCHEME_PATTERN.test(link)) return "url";
  if (isAbsolutePath(link)) return "path";
  return undefined;
}

/**
 * Expands a leading `~` to the home directory. `open()` hands the string to the OS as-is, and neither
 * macOS nor Windows expands `~` on the way, so a path written the way a shell accepts it would fail.
 */
export function resolveLink(link: string): string {
  if (link === "~") return homedir();
  if (link.startsWith("~/")) return `${homedir()}${link.slice(1)}`;
  return link;
}

/** Validates one target. `field` names it in the error message, e.g. `line 2`. */
export function parseTarget(input: unknown, field: string): ParseResult<QuicklinkTarget> {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    const record = input as Record<string, unknown>;
    const link = typeof record.link === "string" ? record.link.trim() : "";
    const application = typeof record.application === "string" ? record.application.trim() : "";

    const kind = classifyLink(link);
    if (!link) return { ok: false, errors: [`${field}: the link is empty`] };
    if (!kind) {
      return {
        ok: false,
        errors: [
          `${field}: "${link}" is neither a URL, an absolute file path, nor a raycast:// deeplink. ` +
            `A bare host name is ambiguous — write https://${link} if you meant a web address.`,
        ],
      };
    }

    const target: QuicklinkTarget = { link };
    if (application) target.application = application;
    return { ok: true, value: target };
  }

  return { ok: false, errors: [`${field}: must be an object with a link`] };
}

/** Validates a set as a whole. Name uniqueness is checked in the store, which knows the other sets. */
export function parseQuicklink(input: unknown): ParseResult<MultipleQuicklink> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["set: must be an object"] };
  }

  const record = input as Record<string, unknown>;
  const errors: string[] = [];

  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) errors.push("id: required");

  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) {
    errors.push("name: required");
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.push(`name: must be at most ${MAX_NAME_LENGTH} characters`);
  }

  const targets: QuicklinkTarget[] = [];
  if (!Array.isArray(record.targets)) {
    errors.push("targets: must be a list");
  } else if (record.targets.length === 0) {
    errors.push("targets: add at least one link");
  } else if (record.targets.length > MAX_TARGETS_PER_SET) {
    errors.push(`targets: ${record.targets.length} links given, at most ${MAX_TARGETS_PER_SET} are accepted`);
  } else {
    record.targets.forEach((entry, index) => {
      const result = parseTarget(entry, `targets: line ${index + 1}`);
      if (result.ok) {
        targets.push(result.value);
      } else {
        errors.push(...result.errors);
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { id, name, targets } };
}

/** Validates stored data, dropping the sets that no longer pass. Used when reading LocalStorage. */
export function parseQuicklinks(input: unknown): MultipleQuicklink[] {
  if (!Array.isArray(input)) return [];
  const sets: MultipleQuicklink[] = [];
  for (const entry of input.slice(0, MAX_SETS)) {
    const result = parseQuicklink(entry);
    if (result.ok) sets.push(result.value);
  }
  return sets;
}
