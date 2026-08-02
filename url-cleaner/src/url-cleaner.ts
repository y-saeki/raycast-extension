import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { cleanText } from "./lib/cleanUrl";
import { loadEnabledRules } from "./lib/ruleStore";

export default async function Command() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("Clipboard is empty");
      return;
    }

    const rules = await loadEnabledRules();
    const { text, changed } = cleanText(clipboardText, rules);

    if (!changed) {
      await showHUD("No URL found, or nothing to clean");
      return;
    }

    await Clipboard.copy(text);
    await showHUD("Cleaned the URL");
  } catch (error) {
    // A rule with a pathological pattern, or a clipboard the system refuses to read, should surface
    // as a message rather than an unhandled rejection.
    await showFailureToast(error, { title: "Could not clean the clipboard" });
  }
}
