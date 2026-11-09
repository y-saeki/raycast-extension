import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { classifyLink, MAX_TARGETS_PER_SET } from "../lib/linkSchema";
import { createQuicklinkId, duplicateName } from "../lib/quicklinkStore";
import { formatTargetText, parseTargetText } from "../lib/targetText";
import { type MultipleQuicklink } from "../lib/types";

export interface QuicklinkFormValues {
  name: string;
  targets: string;
}

/** Maps a validation error to the field it came from, so it can be shown inline. */
const ERROR_FIELDS: [string, keyof QuicklinkFormValues][] = [
  ["name:", "name"],
  ["targets:", "targets"],
];

const KIND_LABELS = {
  url: "URL",
  path: "File",
  deeplink: "Deeplink",
} as const;

/**
 * `duplicate` fills the form from an existing set but saves it as a new one, so the set it was
 * started from keeps its id and stays untouched.
 */
export type QuicklinkFormMode = "create" | "edit" | "duplicate";

type QuicklinkFormProps = {
  /** Names already in use, so a new set gets one the store will accept. */
  existingNames: string[];
  onSave: (set: MultipleQuicklink) => Promise<{ ok: true } | { ok: false; errors: string[] }>;
} & ({ mode: "create"; set?: undefined } | { mode: "edit" | "duplicate"; set: MultipleQuicklink });

const NAVIGATION_TITLES: Record<QuicklinkFormMode, string> = {
  create: "New Multiple Quicklink",
  edit: "Edit Multiple Quicklink",
  duplicate: "Duplicate Multiple Quicklink",
};

function initialValues(
  mode: QuicklinkFormMode,
  set: MultipleQuicklink | undefined,
  existingNames: string[],
): QuicklinkFormValues {
  if (!set) return { name: "", targets: "" };
  return {
    name: mode === "duplicate" ? duplicateName(set.name, existingNames) : set.name,
    targets: formatTargetText(set.targets),
  };
}

export function QuicklinkForm({ mode, set, existingNames, onSave }: QuicklinkFormProps) {
  const { pop } = useNavigation();
  const isEditing = mode === "edit";
  const [values, setValues] = useState<QuicklinkFormValues>(() => initialValues(mode, set, existingNames));
  const [errors, setErrors] = useState<Partial<Record<keyof QuicklinkFormValues, string>>>({});

  function update<K extends keyof QuicklinkFormValues>(field: K, value: QuicklinkFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // Shows what will actually happen — how each line was read, in which order, and in which
  // application — so a mistyped separator or a missing scheme is visible before saving.
  const preview = useMemo(() => {
    if (!values.targets.trim()) {
      return "Add one link per line above to see what this set will open.";
    }

    const parsed = parseTargetText(values.targets);
    if (!parsed.ok) {
      return `⚠️ Not ready to save yet:\n${parsed.errors.map((error) => `- ${error}`).join("\n")}`;
    }

    return parsed.value
      .map((target, index) => {
        const kind = KIND_LABELS[classifyLink(target.link) ?? "url"];
        const application = target.application ? ` in ${target.application}` : "";
        return `${index + 1}. ${kind}: ${target.link}${application}`;
      })
      .join("\n");
  }, [values.targets]);

  async function handleSubmit() {
    const parsed = parseTargetText(values.targets);
    const name = values.name.trim();
    const problems = parsed.ok ? [] : [...parsed.errors];
    if (!name) problems.unshift("name: required");

    if (problems.length === 0 && parsed.ok) {
      const result = await onSave({ id: isEditing ? set.id : createQuicklinkId(), name, targets: parsed.value });
      if (result.ok) {
        pop();
        return;
      }
      problems.push(...result.errors);
    }

    const fieldErrors: Partial<Record<keyof QuicklinkFormValues, string>> = {};
    for (const problem of problems) {
      const entry = ERROR_FIELDS.find(([prefix]) => problem.startsWith(prefix));
      if (entry) fieldErrors[entry[1]] = problem.slice(problem.indexOf(":") + 1).trim();
    }
    setErrors(fieldErrors);
    await showToast({ style: Toast.Style.Failure, title: "Set is not valid", message: problems.join("\n") });
  }

  return (
    <Form
      navigationTitle={NAVIGATION_TITLES[mode]}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Save Set" : "Create Set"} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Example: Morning Routine"
        info="Also how a Quicklink or deeplink refers to this set, so it has to be unique."
        value={values.name}
        error={errors.name}
        onChange={(value) => update("name", value)}
      />
      <Form.TextArea
        id="targets"
        title="Links"
        placeholder={
          "One link per line, opened top to bottom:\n" +
          "https://example.com\n" +
          "https://example.com | Google Chrome\n" +
          "/Users/me/projects/notes.md\n" +
          "raycast://extensions/raycast/raycast/confetti"
        }
        info={
          `A URL, an absolute file path, or a raycast:// deeplink — at most ${MAX_TARGETS_PER_SET} of them. ` +
          `Add " | " and an application name to open that one link somewhere other than the default.`
        }
        value={values.targets}
        error={errors.targets}
        onChange={(value) => update("targets", value)}
      />

      <Form.Separator />
      <Form.Description title="Opens" text={preview} />
    </Form>
  );
}
