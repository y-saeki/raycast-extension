import { closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openTargets, summarize } from "./lib/openTargets";
import { findQuicklinkByName } from "./lib/quicklinkStore";

/**
 * Mirrors the `arguments` this command declares in `package.json`.
 *
 * Raycast also generates `Arguments.OpenMultipleQuicklink` for this, but only into `raycast-env.d.ts`,
 * which `ray develop` writes and the repository does not track — CI type checks without ever running
 * Raycast, so the shape is spelled out here instead.
 */
interface OpenArguments {
  name: string;
}

/**
 * Opens a set by name.
 *
 * This is the command a Quicklink or a deeplink lands on, which is what gives a set an alias and a
 * hotkey — Raycast has no way for an extension to register a root search entry per saved set.
 */
export default async function Command(props: LaunchProps<{ arguments: OpenArguments }>) {
  try {
    const name = props.arguments.name.trim();
    const set = await findQuicklinkByName(name);

    if (!set) {
      await showFailureToast(new Error(`No set is called "${name}".`), { title: "Set not found" });
      return;
    }

    // Closing first hands focus to whatever opens next; left open, Raycast stays frontmost and the
    // windows come up behind it.
    await closeMainWindow();
    const summary = await openTargets(set.targets);
    await showHUD(summarize(summary, set.targets.length));
  } catch (error) {
    // A link the system refuses to handle should surface as a message rather than an unhandled
    // rejection.
    await showFailureToast(error, { title: "Could not open the set" });
  }
}
