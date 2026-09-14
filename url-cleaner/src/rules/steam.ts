import type { UrlRule } from "./types";

/**
 * Steam appends `snr` — its navigation breadcrumb, recording where in the store the link was
 * clicked — to nearly every store URL, and links coming from a curator carry `curator_clanid`.
 * Neither changes which page opens.
 */
const STEAM_TRACKING_PARAMS = ["snr", "curator_clanid"];

export const steamRules: UrlRule[] = [
  {
    // The name slug is decorative: Steam serves the page from the numeric id alone. `agecheck/`
    // is the gate shown before a mature title, and its id is the same product, so it collapses
    // onto the store page itself.
    id: "builtin.steam.store-item",
    name: "Steam: store page URL",
    description:
      "Shortens an app, bundle or package URL to /<type>/<id>/, dropping the title slug and every query parameter (snr, curator_clanid, ...).",
    match: {
      hosts: ["store.steampowered.com"],
      pathPattern: "^\\/(?:agecheck\\/)?(app|bundle|sub)\\/(\\d+)",
    },
    actions: {
      setPath: "/$1/$2/",
      queryMode: "removeAll",
    },
  },
  {
    // Fallback for the rest of the store (search results, wishlists, publisher and curator pages,
    // ...), whose query string carries the page's own state. `remove` rather than `removeAll`:
    // dropping `term` from a search URL would leave a URL that no longer shows what was shared.
    id: "builtin.steam.tracking",
    name: "Steam: store tracking parameters",
    description:
      "Removes snr and curator_clanid from any other Steam store URL, keeping the parameters the page itself needs (search terms, filters, ...).",
    match: {
      hosts: ["store.steampowered.com"],
    },
    actions: {
      queryMode: "remove",
      queryParams: STEAM_TRACKING_PARAMS,
    },
  },
];
