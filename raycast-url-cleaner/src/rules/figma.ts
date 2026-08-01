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

export const figmaRules: UrlRule[] = [
  {
    id: "builtin.figma.slug",
    name: "Figma / FigJam: file URL",
    description:
      "Drops the file, board or prototype name slug and the share token, keeping the selected node (node-id), the editor mode and the prototype settings.",
    match: {
      hosts: ["figma.com"],
      pathPattern: "^\\/(file|design|board|proto)\\/([^\\/]+)\\/[^\\/]*$",
    },
    actions: {
      setPath: "/$1/$2/",
      queryMode: "keepOnly",
      queryParams: FIGMA_KEEP_PARAMS,
    },
  },
  {
    // Fallback for Figma URLs whose path does not carry a name slug (project pages, embeds, ...).
    id: "builtin.figma.share-token",
    name: "Figma / FigJam: share token",
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
