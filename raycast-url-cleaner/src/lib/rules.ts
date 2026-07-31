export interface SiteRule {
  name: string;
  match: (url: URL) => boolean;
  /** Mutates `url` in place. Runs before the generic tracking-param strip. */
  transform: (url: URL) => void;
}

function hostnameIs(hostname: string, base: string): boolean {
  return hostname === base || hostname.endsWith(`.${base}`);
}

const AMAZON_HOST_PATTERN = /(^|\.)amazon\.[a-z.]{2,}$/i;
const AMAZON_ASIN_PATTERN = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i;

const YOUTUBE_ALLOWED_WATCH_PARAMS = new Set(["v", "t"]);

export const rules: SiteRule[] = [
  {
    name: "Amazon",
    match: (url) => AMAZON_HOST_PATTERN.test(url.hostname),
    transform: (url) => {
      const asinMatch = url.pathname.match(AMAZON_ASIN_PATTERN);
      if (!asinMatch) return;
      url.pathname = `/dp/${asinMatch[1]}`;
      url.search = "";
    },
  },
  {
    name: "X (Twitter)",
    match: (url) => hostnameIs(url.hostname, "twitter.com") || hostnameIs(url.hostname, "x.com"),
    transform: (url) => {
      if (/^\/[^/]+\/status\/\d+/.test(url.pathname)) {
        url.search = "";
      }
    },
  },
  {
    name: "YouTube",
    match: (url) => hostnameIs(url.hostname, "youtube.com") || url.hostname === "youtu.be",
    transform: (url) => {
      if (url.hostname === "youtu.be") {
        const videoId = url.pathname.slice(1).split("/")[0];
        const t = url.searchParams.get("t");
        url.hostname = "www.youtube.com";
        url.pathname = "/watch";
        url.search = "";
        if (videoId) url.searchParams.set("v", videoId);
        if (t) url.searchParams.set("t", t);
        return;
      }
      if (url.pathname === "/watch") {
        for (const param of Array.from(url.searchParams.keys())) {
          if (!YOUTUBE_ALLOWED_WATCH_PARAMS.has(param)) {
            url.searchParams.delete(param);
          }
        }
      }
    },
  },
  {
    name: "Figma / FigJam",
    match: (url) => hostnameIs(url.hostname, "figma.com"),
    transform: (url) => {
      const nodeId = url.searchParams.get("node-id");
      url.search = "";
      if (nodeId) url.searchParams.set("node-id", nodeId);
    },
  },
];

/** Finds the first site rule matching this URL's host, if any. */
export function findRule(url: URL): SiteRule | undefined {
  return rules.find((rule) => rule.match(url));
}
