import { amazonRules } from "./amazon";
import { figmaRules } from "./figma";
import { genericRules } from "./generic";
import type { UrlRule } from "./types";
import { xRules } from "./x";
import { youtubeRules } from "./youtube";

/**
 * The rules shipped with the extension, in evaluation order.
 *
 * Within the `site` stage the first matching rule wins, so more specific rules must come first
 * (e.g. `builtin.figma.slug` before `builtin.figma.share-token`). `global` rules always run last,
 * regardless of their position here.
 */
export const builtinRules: UrlRule[] = [...amazonRules, ...xRules, ...youtubeRules, ...figmaRules, ...genericRules];

export { amazonRules, figmaRules, genericRules, xRules, youtubeRules };
export * from "./types";
