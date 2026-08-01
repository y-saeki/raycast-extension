import type { UrlRule } from "./types";

// Figma query params that carry state the URL needs to keep working: the selected node, the editor
// mode (m=dev opens Dev Mode), the Ready for Dev listing, a pinned file version, and the prototype
// playback settings. The share token (t) and everything else are dropped.
const FIGMA_KEEP_PARAMS = [
  "node-id",
  "m",
  "ready-for-dev",
  "version-id",
  "starting-point-node-id",
  "page-id",
  "scaling",
  "content-scaling",
];

// Every Figma editor URL is /<file type>/<file key>/<file name>, so one rule covers them all.
// The types are spelled out rather than matched as `[^/]+` because plain figma.com pages share that
// shape (/legal/us/privacy, ...) and must not have their last path segment stripped. A file type
// missing here degrades safely: it falls through to the rule below, which only touches the query.
const FIGMA_FILE_TYPES = [
  "design", // Figma Design
  "proto", // prototype playback
  "board", // FigJam
  "slides", // Figma Slides
  "deck", // Figma Slides, presentation view
  "site", // Figma Sites
  "buzz", // Figma Buzz
  "make", // Figma Make
  "file", // legacy Figma Design
];

export const figmaRules: UrlRule[] = [
  {
    id: "builtin.figma.slug",
    name: "Figma: file URL",
    description:
      "Drops the file name slug and the share token from Figma Design, FigJam, Slides, Sites, Buzz and Make URLs, keeping the selected node (node-id), the editor mode and the prototype settings.",
    match: {
      hosts: ["figma.com"],
      pathPattern: `^\\/(${FIGMA_FILE_TYPES.join("|")})\\/([^\\/]+)\\/[^\\/]*$`,
    },
    actions: {
      setPath: "/$1/$2/",
      queryMode: "keepOnly",
      queryParams: FIGMA_KEEP_PARAMS,
    },
  },
  {
    // Fallback for Figma URLs whose path does not carry a name slug (project pages, embeds,
    // file types not listed above, ...).
    id: "builtin.figma.share-token",
    name: "Figma: share token",
    description:
      "Drops the share token and other tracking query parameters, keeping the selected node (node-id), the editor mode and the prototype settings.",
    match: {
      hosts: ["figma.com"],
    },
    actions: {
      queryMode: "keepOnly",
      queryParams: FIGMA_KEEP_PARAMS,
    },
  },
];
