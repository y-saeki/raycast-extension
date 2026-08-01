import { Clipboard, showHUD } from "@raycast/api";
import { cleanText } from "./lib/cleanUrl";
import { loadEnabledRules } from "./lib/ruleStore";

export default async function Command() {
  const clipboardText = await Clipboard.readText();

  if (!clipboardText) {
    await showHUD("クリップボードが空です");
    return;
  }

  const rules = await loadEnabledRules();
  const { text, changed } = cleanText(clipboardText, rules);

  if (!changed) {
    await showHUD("URLが見つからないか、変更はありませんでした");
    return;
  }

  await Clipboard.copy(text);
  await showHUD("URLをクリーンにしました");
}
