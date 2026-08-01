import type { UrlRule } from "./types";

export const amazonRules: UrlRule[] = [
  {
    id: "builtin.amazon.product",
    name: "Amazon: product URL",
    description: "Shortens a product URL to /dp/<ASIN>, dropping the product name slug and every query parameter.",
    match: {
      hostPattern: "(^|\\.)amazon\\.[a-z.]{2,}$",
      pathPattern: "\\/(?:dp|gp\\/product)\\/([A-Z0-9]{10})",
    },
    actions: {
      setPath: "/dp/$1",
      queryMode: "removeAll",
    },
  },
];
