import { open } from "@raycast/api";
import { resolveLink } from "./linkSchema";
import { type QuicklinkTarget } from "./types";

/**
 * Applications are slow to claim focus, and `open()` returns as soon as the OS accepts the request,
 * not when the window is up. Firing the whole set back to back therefore lets a fast-launching link
 * overtake a slow one and land on top, which for a set the user ordered deliberately is the wrong
 * result. A short pause between requests is enough to keep them in order, and is short enough that
 * even a full set of twenty stays under three seconds.
 */
export const OPEN_INTERVAL_MS = 150;

export interface OpenFailure {
  target: QuicklinkTarget;
  message: string;
}

export interface OpenSummary {
  opened: number;
  failures: OpenFailure[];
}

export interface OpenDependencies {
  open: (target: string, application?: string) => Promise<void>;
  wait: (ms: number) => Promise<void>;
}

const defaultDependencies: OpenDependencies = {
  open: (target, application) => open(target, application),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Opens every target in order.
 *
 * A target that fails — a path that no longer exists, a deeplink into an extension that is not
 * installed — does not stop the ones after it: a set is a starting point for some piece of work, and
 * getting most of it up beats getting none of it. The failures come back for the caller to report
 * once, at the end.
 */
export async function openTargets(
  targets: QuicklinkTarget[],
  dependencies: Partial<OpenDependencies> = {},
): Promise<OpenSummary> {
  const { open: openTarget, wait } = { ...defaultDependencies, ...dependencies };
  const failures: OpenFailure[] = [];
  let opened = 0;

  for (const [index, target] of targets.entries()) {
    if (index > 0) await wait(OPEN_INTERVAL_MS);

    try {
      await openTarget(resolveLink(target.link), target.application);
      opened += 1;
    } catch (error) {
      failures.push({ target, message: error instanceof Error ? error.message : String(error) });
    }
  }

  return { opened, failures };
}

/** One line describing how the run went, for a HUD or a toast. */
export function summarize(summary: OpenSummary, total: number): string {
  if (summary.failures.length === 0) {
    return total === 1 ? "Opened 1 link" : `Opened ${total} links`;
  }
  return `Opened ${summary.opened} of ${total} links — ${summary.failures.length} failed`;
}
