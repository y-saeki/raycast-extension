import type { UrlRule } from "./types";

export const meetRules: UrlRule[] = [
  {
    id: "builtin.meet.code",
    name: "Google Meet: meeting URL",
    description: "Drops every query parameter (authuser, hs, pli, ...) from a meeting URL.",
    match: {
      hosts: ["meet.google.com"],
      pathPattern: "^\\/[a-z]{3}-[a-z]{4}-[a-z]{3}$",
    },
    actions: {
      queryMode: "removeAll",
    },
  },
  {
    // Calendar entries link to a per-event alias instead of the meeting code.
    id: "builtin.meet.lookup",
    name: "Google Meet: lookup URL",
    description: "Drops every query parameter from a calendar lookup URL.",
    match: {
      hosts: ["meet.google.com"],
      pathPattern: "^\\/lookup\\/[^\\/]+$",
    },
    actions: {
      queryMode: "removeAll",
    },
  },
];
