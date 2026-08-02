import type { UrlRule } from "./types";

/**
 * YouTube is handled in two layers.
 *
 * The `site` rules below funnel every video URL — youtu.be, Shorts, Live, embeds — into one
 * canonical `www.youtube.com/watch?v=<id>` form. The `global` rule at the end then shortens that
 * to `youtu.be/<id>`.
 *
 * That last rule ships switched off (see `defaultDisabledBuiltinRuleIds` in `./index`), so the
 * canonical youtube.com form is what users get by default — including for URLs that came in as
 * youtu.be, which the first rule expands. Turning the rule on gives short URLs throughout.
 */
export const youtubeRules: UrlRule[] = [
  {
    id: "builtin.youtube.short",
    name: "YouTube: youtu.be short URL",
    description: "Normalizes youtu.be/<id>, keeping the start time (t) and the playlist (list).",
    match: {
      hosts: ["youtu.be"],
      pathPattern: "^\\/([A-Za-z0-9_-]+)\\/?$",
    },
    actions: {
      setHost: "www.youtube.com",
      setPath: "/watch",
      setParams: { v: "$1" },
      queryMode: "keepOnly",
      queryParams: ["t", "list"],
    },
  },
  {
    // Must come before the video-path rule: "videoseries" is a playlist marker, not a video id.
    id: "builtin.youtube.embed-playlist",
    name: "YouTube: embedded playlist URL",
    description: "Turns youtube.com/embed/videoseries?list=<id> into the playlist page.",
    match: {
      hosts: ["youtube.com"],
      pathPattern: "^\\/embed\\/videoseries$",
    },
    actions: {
      setPath: "/playlist",
      queryMode: "keepOnly",
      queryParams: ["list"],
    },
  },
  {
    id: "builtin.youtube.video-path",
    name: "YouTube: Shorts, Live and embed URL",
    description: "Turns /shorts/<id>, /live/<id>, /embed/<id> and /v/<id> into a watch URL.",
    match: {
      hosts: ["youtube.com"],
      pathPattern: "^\\/(?:shorts|live|embed|v)\\/([A-Za-z0-9_-]+)",
    },
    actions: {
      setPath: "/watch",
      setParams: { v: "$1" },
      queryMode: "keepOnly",
      queryParams: ["t", "list"],
    },
  },
  {
    id: "builtin.youtube.watch",
    name: "YouTube: watch URL",
    description: "Keeps only the video id (v), the start time (t) and the playlist (list).",
    match: {
      hosts: ["youtube.com"],
      pathPattern: "^\\/watch$",
    },
    actions: {
      queryMode: "keepOnly",
      queryParams: ["v", "t", "list"],
    },
  },
  {
    id: "builtin.youtube.playlist",
    name: "YouTube: playlist URL",
    description: "Keeps only the playlist id (list).",
    match: {
      hosts: ["youtube.com"],
      pathPattern: "^\\/playlist$",
    },
    actions: {
      queryMode: "keepOnly",
      queryParams: ["list"],
    },
  },
  {
    // `hostPattern` rather than `hosts`, which matches subdomains: music.youtube.com/watch is a
    // YouTube Music URL, and rewriting it to youtu.be would point at a different service.
    id: "builtin.youtube.shorten",
    name: "YouTube: shorten to youtu.be",
    description: "Rewrites youtube.com/watch?v=<id> to youtu.be/<id>. Off by default; turn it on for short URLs.",
    stage: "global",
    match: {
      hostPattern: "^(?:www\\.|m\\.)?youtube\\.com$",
      pathPattern: "^\\/watch$",
      hasParams: ["v"],
    },
    actions: {
      setHost: "youtu.be",
      setPath: "/${v}",
      queryMode: "keepOnly",
      queryParams: ["t", "list"],
    },
  },
];
