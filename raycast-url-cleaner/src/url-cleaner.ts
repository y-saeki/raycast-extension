import { Clipboard, getPreferenceValues, popToRoot, showHUD } from "@raycast/api";
import { cleanText } from "./lib/cleanUrl";

interface Preferences {
  exitAfterCleaning: boolean;
}

export default async function Command() {
  const clipboardText = await Clipboard.readText();

  if (!clipboardText) {
    await showHUD("クリップボードが空です");
    return;
  }

  const { text, changed } = cleanText(clipboardText);

  if (!changed) {
    await showHUD("URLが見つからないか、変更はありませんでした");
    return;
  }

  await Clipboard.copy(text);

  const { exitAfterCleaning } = getPreferenceValues<Preferences>();
  if (exitAfterCleaning) {
    await popToRoot({ clearSearchBar: true });
  }

  await showHUD("URLをクリーンにしました");
}
