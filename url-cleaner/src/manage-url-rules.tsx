import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { RuleForm } from "./components/RuleForm";
import { describeMatch } from "./lib/describeRule";
import { formatImportConfirmation } from "./lib/importSummary";
import { parseRulesJson } from "./lib/ruleSchema";
import {
  deleteUserRule,
  importUserRules,
  loadRuleSet,
  loadUserRules,
  resetToDefaults,
  saveUserRule,
  setRuleEnabled,
  type RuleListEntry,
} from "./lib/ruleStore";
import type { UrlRule } from "./rules/types";

/** The rule list has room for a wider separator between a rule's match conditions. */
const MATCH_SEPARATOR = "  ·  ";

export default function Command() {
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

  async function handleToggle(entry: RuleListEntry) {
    await setRuleEnabled(entry.rule.id, !entry.enabled);
    await reload();
    await showToast({
      style: Toast.Style.Success,
      title: entry.enabled ? "Rule disabled" : "Rule enabled",
      message: entry.rule.name,
    });
  }

  async function handleSave(rule: UrlRule) {
    await saveUserRule(rule);
    await reload();
    await showToast({ style: Toast.Style.Success, title: "Rule saved", message: rule.name });
  }

  async function handleDelete(rule: UrlRule) {
    const confirmed = await confirmAlert({
      title: "Delete this rule?",
      message: `"${rule.name}" will be removed. This cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await deleteUserRule(rule.id);
    await reload();
    await showToast({ style: Toast.Style.Success, title: "Rule deleted", message: rule.name });
  }

  async function handleExport() {
    const userRules = await loadUserRules();
    if (userRules.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No rules to export", message: "Create a rule first." });
      return;
    }
    await Clipboard.copy(JSON.stringify(userRules, null, 2));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: `${userRules.length} rule(s) as JSON`,
    });
  }

  async function handleImport() {
    const json = await Clipboard.readText();
    if (!json?.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
      return;
    }

    const parsed = parseRulesJson(json);
    if (!parsed.ok) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not import rules",
        message: parsed.errors.join("\n"),
      });
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
    await showToast({
      style: Toast.Style.Success,
      title: "Rules imported",
      message: `${added} added, ${replaced} replaced`,
    });
  }

  async function handleReset() {
    const confirmed = await confirmAlert({
      title: "Reset to defaults?",
      message: "Every rule you created will be deleted and all built-in rules will be enabled again.",
      primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await resetToDefaults();
    await reload();
    await showToast({ style: Toast.Style.Success, title: "Reset to defaults" });
  }

  const userEntries = entries.filter((entry) => !entry.isBuiltin);
  const builtinEntries = entries.filter((entry) => entry.isBuiltin);
  const existingIds = entries.map((entry) => entry.rule.id);

  function actionsFor(entry?: RuleListEntry) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {entry && (
            <Action
              title={entry.enabled ? "Disable Rule" : "Enable Rule"}
              icon={entry.enabled ? Icon.Circle : Icon.CheckCircle}
              onAction={() => handleToggle(entry)}
            />
          )}
          <Action.Push
            title="Create Rule"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<RuleForm mode="create" existingIds={existingIds} onSave={handleSave} />}
          />
          {entry && !entry.isBuiltin && (
            <Action.Push
              title="Edit Rule"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<RuleForm mode="edit" rule={entry.rule} existingIds={existingIds} onSave={handleSave} />}
            />
          )}
          {/* Offered for built-in rules too: duplicating one is the only way to start from it, since
              built-in rules themselves cannot be edited. */}
          {entry && (
            <Action.Push
              title="Duplicate Rule"
              icon={Icon.CopyClipboard}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              target={<RuleForm mode="duplicate" rule={entry.rule} existingIds={existingIds} onSave={handleSave} />}
            />
          )}
          {entry && !entry.isBuiltin && (
            <Action
              title="Delete Rule"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => handleDelete(entry.rule)}
            />
          )}
        </ActionPanel.Section>

        <ActionPanel.Section>
          {/* Raycast does not translate `cmd` to `ctrl` on Windows, so ambiguous modifiers have to be
              spelled out per platform. The shortcuts above use Keyboard.Shortcut.Common, which
              already carries both. */}
          <Action
            title="Export Rules to Clipboard"
            icon={Icon.Download}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "e" },
              Windows: { modifiers: ["ctrl", "shift"], key: "e" },
            }}
            onAction={handleExport}
          />
          <Action
            title="Import Rules from Clipboard"
            icon={Icon.Upload}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "i" },
              Windows: { modifiers: ["ctrl", "shift"], key: "i" },
            }}
            onAction={handleImport}
          />
          <Action
            title="Reset to Defaults"
            icon={Icon.ArrowCounterClockwise}
            style={Action.Style.Destructive}
            onAction={handleReset}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function itemFor(entry: RuleListEntry) {
    return (
      <List.Item
        key={entry.rule.id}
        icon={
          entry.enabled
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.Circle, tintColor: Color.SecondaryText }
        }
        title={entry.rule.name}
        subtitle={describeMatch(entry.rule, MATCH_SEPARATOR)}
        accessories={[
          entry.rule.scope === "global" ? { tag: "global" } : {},
          { text: entry.enabled ? "Enabled" : "Disabled" },
        ]}
        actions={actionsFor(entry)}
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search URL rules">
      {/* Held back until the rules have loaded: rendering it against the initial empty list makes
          "No rules found" flash before the built-in rules appear.
          The description names no keys — `environment` exposes no platform to pick ⌘ or Ctrl from,
          and the action panel already shows the right shortcut for whichever platform it runs on. */}
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Link}
          title="No rules found"
          description="Use the actions below to create a rule, or import rules from the clipboard."
          actions={actionsFor()}
        />
      )}
      <List.Section title="Your Rules" subtitle={userEntries.length > 0 ? `${userEntries.length}` : "none yet"}>
        {userEntries.map(itemFor)}
      </List.Section>
      <List.Section title="Built-in Rules" subtitle={`${builtinEntries.length}`}>
        {builtinEntries.map(itemFor)}
      </List.Section>
    </List>
  );
}
