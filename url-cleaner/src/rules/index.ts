import { amazonRules } from "./amazon";
import { figmaRules } from "./figma";
import { genericRules } from "./generic";
import { meetRules } from "./meet";
import type { UrlRule } from "./types";
import { xRules } from "./x";
import { youtubeRules } from "./youtube";

/**
 * The rules shipped with the extension, in evaluation order.
 *
 * Among the `site` rules the first matching one wins, so more specific rules must come first
 * (e.g. `builtin.figma.slug` before `builtin.figma.share-token`). `global` rules always run last,
 * regardless of their position here.
 */
export const builtinRules: UrlRule[] = [
  ...amazonRules,
  ...xRules,
  ...youtubeRules,
  ...meetRules,
  ...figmaRules,
  ...genericRules,
];

/**
 * Built-in rules that ship switched off.
 *
 * These ids are seeded into the stored disabled list exactly once, on first load; after that the
 * user's own choice wins, so turning one on survives extension updates. See `lib/ruleStore.ts`.
 */
export const defaultDisabledBuiltinRuleIds: readonly string[] = ["builtin.youtube.shorten"];

export { amazonRules, figmaRules, genericRules, meetRules, xRules, youtubeRules };
export * from "./types";
