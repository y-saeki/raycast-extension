/** The kinds of thing a target can point at. Only used for display and validation messages. */
export const LINK_KINDS = ["url", "path", "deeplink"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

/** One thing to open: a URL, an absolute file path, or a `raycast://` deeplink. */
export interface QuicklinkTarget {
  link: string;
  /**
   * Which application opens the link — an application name, a bundle id, or an absolute path to the
   * application. Left out, the system default handles it.
   */
  application?: string;
}

/** A named set of targets that open together. */
export interface MultipleQuicklink {
  /** Stable id. Never shown to the user; the name is what they see and search by. */
  id: string;
  /**
   * Display name, and the argument `Open Multiple Quicklink` looks a set up by. Unique across sets,
   * ignoring case, so a deeplink always resolves to exactly one set.
   */
  name: string;
  targets: QuicklinkTarget[];
}

export const USER_ID_PREFIX = "set-";
