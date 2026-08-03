import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { RuleForm } from "./components/RuleForm";
import { useRuleSet } from "./hooks/useRuleSet";
import { describeMatch } from "./lib/describeRule";
import { type RuleListEntry } from "./lib/ruleStore";
import type { UrlRule } from "./rules/types";

/** The rule list has room for a wider separator between a rule's match conditions. */
const MATCH_SEPARATOR = "  ·  ";

/**
 * Raycast does not translate `cmd` to `ctrl` on Windows, so ambiguous modifiers have to be spelled
 * out per platform. The rule actions use `Keyboard.Shortcut.Common`, which already carries both.
 */
function shiftShortcut(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", "shift"], key },
    Windows: { modifiers: ["ctrl", "shift"], key },
  };
}

export default function Command() {
  const { entries, isLoading, toggle, save, remove, exportRules, importRules, reset } = useRuleSet();

  const userEntries = entries.filter((entry) => !entry.isBuiltin);
  const builtinEntries = entries.filter((entry) => entry.isBuiltin);
  const existingIds = entries.map((entry) => entry.rule.id);

  /** An action that opens the rule form. The mode decides whether a source rule is required. */
  function ruleFormAction(
    props: { title: string; icon: Icon; shortcut: Keyboard.Shortcut } & (
      { mode: "create" } | { mode: "edit" | "duplicate"; rule: UrlRule }
    ),
  ) {
    return (
      <Action.Push
        title={props.title}
        icon={props.icon}
        shortcut={props.shortcut}
        target={
          props.mode === "create" ? (
            <RuleForm mode="create" existingIds={existingIds} onSave={save} />
          ) : (
            <RuleForm mode={props.mode} rule={props.rule} existingIds={existingIds} onSave={save} />
          )
        }
      />
    );
  }

  function actionsFor(entry?: RuleListEntry) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {entry && (
            <Action
              title={entry.enabled ? "Disable Rule" : "Enable Rule"}
              icon={entry.enabled ? Icon.Circle : Icon.CheckCircle}
              onAction={() => toggle(entry)}
            />
          )}
          {ruleFormAction({
            mode: "create",
            title: "Create Rule",
            icon: Icon.Plus,
            shortcut: Keyboard.Shortcut.Common.New,
          })}
          {entry &&
            !entry.isBuiltin &&
            ruleFormAction({
              mode: "edit",
              rule: entry.rule,
              title: "Edit Rule",
              icon: Icon.Pencil,
              shortcut: Keyboard.Shortcut.Common.Edit,
            })}
          {/* Offered for built-in rules too: duplicating one is the only way to start from it, since
              built-in rules themselves cannot be edited. */}
          {entry &&
            ruleFormAction({
              mode: "duplicate",
              rule: entry.rule,
              title: "Duplicate Rule",
              icon: Icon.CopyClipboard,
              shortcut: Keyboard.Shortcut.Common.Duplicate,
            })}
          {entry && !entry.isBuiltin && (
            <Action
              title="Delete Rule"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => remove(entry.rule)}
            />
          )}
        </ActionPanel.Section>

        <ActionPanel.Section>
          <Action
            title="Export Rules to Clipboard"
            icon={Icon.Download}
            shortcut={shiftShortcut("e")}
            onAction={exportRules}
          />
          <Action
            title="Import Rules from Clipboard"
            icon={Icon.Upload}
            shortcut={shiftShortcut("i")}
            onAction={importRules}
          />
          <Action
            title="Reset to Defaults"
            icon={Icon.ArrowCounterClockwise}
            style={Action.Style.Destructive}
            onAction={reset}
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
