import type { UrlRule } from "./types";

export const figmaRules: UrlRule[] = [
  {
    id: "builtin.figma.slug",
    name: "Figma / FigJam: file URL",
    description: "Drops the file or board name slug and the share token, keeping the selected node (node-id).",
    match: {
      hosts: ["figma.com"],
      pathPattern: "^\\/(file|design|board)\\/([^\\/]+)\\/[^\\/]*$",
    },
    actions: {
      setPath: "/$1/$2/",
      queryMode: "keepOnly",
      queryParams: ["node-id"],
    },
  },
  {
    // Fallback for Figma URLs whose path does not carry a name slug (project pages, embeds, ...).
    id: "builtin.figma.share-token",
    name: "Figma / FigJam: share token",
    description: "Drops the share token and other query parameters, keeping the selected node (node-id).",
    match: {
      hosts: ["figma.com"],
    },
    actions: {
      queryMode: "keepOnly",
      queryParams: ["node-id"],
    },
  },
];
