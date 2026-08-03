import { Alert, Clipboard, confirmAlert, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { formatImportConfirmation } from "../lib/importSummary";
import { parseRulesJson } from "../lib/ruleSchema";
import {
  deleteUserRule,
  importUserRules,
  loadRuleSet,
  loadUserRules,
  resetToDefaults,
  saveUserRule,
  setRuleEnabled,
  type RuleListEntry,
} from "../lib/ruleStore";
import type { UrlRule } from "../rules/types";

async function showSuccess(title: string, message?: string): Promise<void> {
  await showToast({ style: Toast.Style.Success, title, message });
}

async function showFailure(title: string, message?: string): Promise<void> {
  await showToast({ style: Toast.Style.Failure, title, message });
}

async function confirmDestructive(title: string, message: string, actionTitle: string): Promise<boolean> {
  return confirmAlert({
    title,
    message,
    primaryAction: { title: actionTitle, style: Alert.ActionStyle.Destructive },
  });
}

export interface RuleSetActions {
  entries: RuleListEntry[];
  isLoading: boolean;
  toggle: (entry: RuleListEntry) => Promise<void>;
  save: (rule: UrlRule) => Promise<void>;
  remove: (rule: UrlRule) => Promise<void>;
  exportRules: () => Promise<void>;
  importRules: () => Promise<void>;
  reset: () => Promise<void>;
}

/**
 * Holds the rule list and every operation that changes it, each reloading the list and reporting
 * what happened. Keeps the command file to its list rendering.
 */
export function useRuleSet(): RuleSetActions {
  const [entries, setEntries] = useState<RuleListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const { entries } = await loadRuleSet();
    setEntries(entries);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function toggle(entry: RuleListEntry) {
    await setRuleEnabled(entry.rule.id, !entry.enabled);
    await reload();
    await showSuccess(entry.enabled ? "Rule disabled" : "Rule enabled", entry.rule.name);
  }

  async function save(rule: UrlRule) {
    await saveUserRule(rule);
    await reload();
    await showSuccess("Rule saved", rule.name);
  }

  async function remove(rule: UrlRule) {
    const confirmed = await confirmDestructive(
      "Delete this rule?",
      `"${rule.name}" will be removed. This cannot be undone.`,
      "Delete",
    );
    if (!confirmed) return;

    await deleteUserRule(rule.id);
    await reload();
    await showSuccess("Rule deleted", rule.name);
  }

  async function exportRules() {
    const userRules = await loadUserRules();
    if (userRules.length === 0) {
      await showFailure("No rules to export", "Create a rule first.");
      return;
    }
    await Clipboard.copy(JSON.stringify(userRules, null, 2));
    await showSuccess("Copied to clipboard", `${userRules.length} rule(s) as JSON`);
  }

  async function importRules() {
    const json = await Clipboard.readText();
    if (!json?.trim()) {
      await showFailure("Clipboard is empty");
      return;
    }

    const parsed = parseRulesJson(json);
    if (!parsed.ok) {
      await showFailure("Could not import rules", parsed.errors.join("\n"));
      return;
    }

    const confirmed = await confirmAlert({
      title: `Import ${parsed.value.length} rule(s)?`,
      message: formatImportConfirmation(parsed.value),
      primaryAction: { title: "Import" },
    });
    if (!confirmed) return;

    const { added, replaced } = await importUserRules(parsed.value);
    await reload();
    await showSuccess("Rules imported", `${added} added, ${replaced} replaced`);
  }

  async function reset() {
    const confirmed = await confirmDestructive(
      "Reset to defaults?",
      "Every rule you created will be deleted and all built-in rules will be enabled again.",
      "Reset",
    );
    if (!confirmed) return;

    await resetToDefaults();
    await reload();
    await showSuccess("Reset to defaults");
  }

  return { entries, isLoading, toggle, save, remove, exportRules, importRules, reset };
}
