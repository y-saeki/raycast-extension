import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { QuicklinkForm } from "./components/QuicklinkForm";
import { deeplinkForName } from "./lib/deeplink";
import { classifyLink } from "./lib/linkSchema";
import { openTargets, summarize } from "./lib/openTargets";
import { deleteQuicklink, loadQuicklinks, saveQuicklink } from "./lib/quicklinkStore";
import { type MultipleQuicklink } from "./lib/types";

const KIND_TAGS = {
  url: "URL",
  path: "File",
  deeplink: "Deeplink",
} as const;

/** One-line summary of where a set leads, shown under its name. */
function describeTargets(set: MultipleQuicklink): string {
  return set.targets.map((target) => target.link).join("  ·  ");
}

/** The distinct kinds a set opens, so the list shows at a glance that it mixes URLs and files. */
function kindTags(set: MultipleQuicklink): string[] {
  const kinds = new Set(set.targets.map((target) => classifyLink(target.link)));
  return [...kinds].filter((kind) => kind !== undefined).map((kind) => KIND_TAGS[kind]);
}

export default function Command() {
  const [sets, setSets] = useState<MultipleQuicklink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setSets(await loadQuicklinks());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleOpen(set: MultipleQuicklink) {
    // Closing first hands focus to whatever opens next. Left open, Raycast stays frontmost and the
    // windows come up behind it, which for an ordered set is exactly the wrong result.
    await closeMainWindow();
    const summary = await openTargets(set.targets);
    await showHUD(summarize(summary, set.targets.length));
  }

  async function handleSave(set: MultipleQuicklink) {
    const result = await saveQuicklink(set);
    if (result.ok) {
      await reload();
      await showToast({ style: Toast.Style.Success, title: "Set saved", message: set.name });
    }
    return result;
  }

  async function handleDelete(set: MultipleQuicklink) {
    const confirmed = await confirmAlert({
      title: "Delete this set?",
      message: `"${set.name}" will be removed. This cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await deleteQuicklink(set.id);
    await reload();
    await showToast({ style: Toast.Style.Success, title: "Set deleted", message: set.name });
  }

  const existingNames = sets.map((set) => set.name);

  function actionsFor(set?: MultipleQuicklink) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {set && <Action title="Open All Links" icon={Icon.ArrowRight} onAction={() => handleOpen(set)} />}
          {/* Raycast cannot give a saved set its own root search entry, but it can give one to a
              Quicklink. Turning this deeplink into a Quicklink is therefore how a set gets an alias
              and a hotkey — Raycast's own machinery rather than a reimplementation of it. */}
          {set && (
            <Action.CreateQuicklink
              title="Create Quicklink for This Set"
              icon={Icon.Link}
              quicklink={{ name: set.name, link: deeplinkForName(set.name) }}
            />
          )}
          {set && (
            <Action.CopyToClipboard
              title="Copy Deeplink"
              icon={Icon.CopyClipboard}
              content={deeplinkForName(set.name)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
        </ActionPanel.Section>

        <ActionPanel.Section>
          <Action.Push
            title="Create Set"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<QuicklinkForm mode="create" existingNames={existingNames} onSave={handleSave} />}
          />
          {set && (
            <Action.Push
              title="Edit Set"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<QuicklinkForm mode="edit" set={set} existingNames={existingNames} onSave={handleSave} />}
            />
          )}
          {set && (
            <Action.Push
              title="Duplicate Set"
              icon={Icon.CopyClipboard}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              target={<QuicklinkForm mode="duplicate" set={set} existingNames={existingNames} onSave={handleSave} />}
            />
          )}
          {set && (
            <Action
              title="Delete Set"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => handleDelete(set)}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your sets">
      {/* Held back until the sets have loaded: rendering it against the initial empty list makes
          "No sets yet" flash before the saved sets appear. */}
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Link}
          title="No sets yet"
          description="Use the actions below to create a set of links that open together."
          actions={actionsFor()}
        />
      )}
      {sets.map((set) => (
        <List.Item
          key={set.id}
          icon={Icon.Link}
          title={set.name}
          subtitle={describeTargets(set)}
          accessories={[
            ...kindTags(set).map((tag) => ({ tag })),
            { text: set.targets.length === 1 ? "1 link" : `${set.targets.length} links` },
          ]}
          actions={actionsFor(set)}
        />
      ))}
    </List>
  );
}
