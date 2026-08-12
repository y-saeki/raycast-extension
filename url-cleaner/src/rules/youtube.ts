import type { UrlRule } from "./types";

/**
 * YouTube is handled in two layers.
 *
 * The `site` rules below funnel every video URL — youtu.be, Shorts, Live — into one canonical
 * `www.youtube.com/watch?v=<id>` form. The `global` rule at the end then shortens that to
 * `youtu.be/<id>`.
 *
 * Embed URLs (`/embed/<id>`) are the exception: rewriting one to a watch URL breaks the embed
 * code it was copied for, so those keep their path and only lose their tracking parameters.
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
    // Embed URLs are left on /embed so the embed code they were copied for keeps working, which
    // also covers /embed/videoseries?list=<id>, the embedded form of a playlist. `remove` rather
    // than `keepOnly`: an embed carries player options (autoplay, start, loop, ...) that are the
    // point of the URL, so only the parameters known to be tracking are dropped.
    id: "builtin.youtube.embed",
    name: "YouTube: embed URL",
    description: "Removes the share tracking parameters (si, feature, pp) from /embed/<id>, keeping the embed URL.",
    match: {
      hosts: ["youtube.com"],
      pathPattern: "^\\/embed\\/",
    },
    actions: {
      queryMode: "remove",
      queryParams: ["si", "feature", "pp"],
    },
  },
  {
    id: "builtin.youtube.video-path",
    name: "YouTube: Shorts and Live URL",
    description: "Turns /shorts/<id>, /live/<id> and /v/<id> into a watch URL.",
    match: {
      hosts: ["youtube.com"],
      pathPattern: "^\\/(?:shorts|live|v)\\/([A-Za-z0-9_-]+)",
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
    scope: "global",
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
