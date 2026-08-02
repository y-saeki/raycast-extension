import type { UrlRule } from "./types";

/** Domain-agnostic tracking/analytics query parameters. */
export const GENERIC_TRACKING_PARAMS = [
  // UTM family
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  // Ad platform click IDs
  "gclid",
  "gbraid",
  "wbraid",
  "dclid",
  "fbclid",
  "msclkid",
  "twclid",
  "ttclid",
  "li_fat_id",
  "yclid",
  // Analytics handshakes
  "_ga",
  "_gl",
  // Misc
  "igshid",
  "mc_cid",
  "mc_eid",
];

export const genericRules: UrlRule[] = [
  {
    id: "builtin.generic.tracking",
    name: "Generic tracking parameters",
    description: "Removes utm_*, gclid, fbclid and friends from any URL, after the site rules have run.",
    scope: "global",
    match: {},
    actions: {
      queryMode: "remove",
      queryParams: GENERIC_TRACKING_PARAMS,
    },
  },
];
