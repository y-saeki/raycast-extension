import type { UrlRule } from "./types";

export const youtubeRules: UrlRule[] = [
  {
    id: "builtin.youtube.short",
    name: "YouTube: youtu.be short URL",
    description: "Expands youtu.be/<id> to youtube.com/watch?v=<id>, keeping the start time (t).",
    match: {
      hosts: ["youtu.be"],
      pathPattern: "^\\/([^\\/]+)",
    },
    actions: {
      setHost: "www.youtube.com",
      setPath: "/watch",
      setParams: { v: "$1" },
      queryMode: "keepOnly",
      queryParams: ["t"],
    },
  },
  {
    id: "builtin.youtube.watch",
    name: "YouTube: watch URL",
    description: "Keeps only the video id (v) and start time (t).",
    match: {
      hosts: ["youtube.com"],
      pathPattern: "^\\/watch$",
    },
    actions: {
      queryMode: "keepOnly",
      queryParams: ["v", "t"],
    },
  },
];
