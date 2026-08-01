import type { UrlRule } from "./types";

export const xRules: UrlRule[] = [
  {
    id: "builtin.x.status",
    name: "X (Twitter): post URL",
    description: "Drops every query parameter from a post (status) URL.",
    match: {
      hosts: ["twitter.com", "x.com"],
      pathPattern: "^\\/[^\\/]+\\/status\\/\\d+",
    },
    actions: {
      queryMode: "removeAll",
    },
  },
];
