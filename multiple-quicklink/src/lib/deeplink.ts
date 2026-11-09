/**
 * Deeplinks are what make a set reachable the way a Quicklink is.
 *
 * An extension cannot add a root search entry per saved set — Raycast only knows the commands in the
 * manifest. What it can do is hand the user a deeplink to `Open Multiple Quicklink` with the set's
 * name already filled in; turning that into a native Quicklink gives the set its own root search
 * entry, alias and hotkey, all maintained by Raycast rather than reimplemented here.
 *
 * The URL is assembled here rather than through `createDeeplink` so it can be unit tested without a
 * Raycast runtime. `deeplink.test.ts` asserts the constants below still match `package.json`.
 */
export const AUTHOR_NAME = "y-saeki";
export const EXTENSION_NAME = "multiple-quicklink";
export const OPEN_COMMAND_NAME = "open-multiple-quicklink";

/** Builds the deeplink that opens `name`'s set. */
export function deeplinkForName(name: string): string {
  const args = encodeURIComponent(JSON.stringify({ name }));
  return `raycast://extensions/${AUTHOR_NAME}/${EXTENSION_NAME}/${OPEN_COMMAND_NAME}?arguments=${args}`;
}
