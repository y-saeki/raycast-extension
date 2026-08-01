/** Domain-agnostic tracking/analytics query parameters, stripped from any URL that isn't handled by a more specific site rule. */
export const GENERIC_TRACKING_PARAMS = new Set([
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
]);

/** Removes generic tracking params from a URL in place. Returns whether anything was removed. */
export function stripGenericTrackingParams(url: URL): boolean {
  let changed = false;
  for (const param of Array.from(url.searchParams.keys())) {
    if (GENERIC_TRACKING_PARAMS.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  }
  return changed;
}
