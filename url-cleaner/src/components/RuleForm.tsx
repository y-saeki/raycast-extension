import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { cleanUrl } from "../lib/cleanUrl";
import { parseRule } from "../lib/ruleSchema";
import { createUserRuleId, duplicateRuleName } from "../lib/ruleStore";
import { QUERY_MODES, RULE_SCOPES, type QueryMode, type RuleScope, type UrlRule } from "../rules/types";

export interface RuleFormValues {
  name: string;
  description: string;
  scope: RuleScope;
  hosts: string;
  hostPattern: string;
  pathPattern: string;
  hasParams: string;
  setHost: string;
  setPath: string;
  queryMode: QueryMode;
  queryParams: string;
  setParams: string;
  testUrl: string;
}

const EMPTY_VALUES: RuleFormValues = {
  name: "",
  description: "",
  scope: "site",
  hosts: "",
  hostPattern: "",
  pathPattern: "",
  hasParams: "",
  setHost: "",
  setPath: "",
  queryMode: "keepAll",
  queryParams: "",
  setParams: "",
  testUrl: "",
};

const SCOPE_TITLES: Record<RuleScope, string> = {
  site: "Site — written for one site; only the first matching site rule runs",
  global: "Global — can cover any URL; runs after the site rules, and every match applies",
};

const QUERY_MODE_TITLES: Record<QueryMode, string> = {
  keepAll: "Keep All — leave the query string alone",
  removeAll: "Remove All — drop every parameter",
  keepOnly: "Keep Only — keep the parameters listed below",
  remove: "Remove — drop the parameters listed below",
};

/** Maps a validation error to the form field it came from, so it can be shown inline. */
const ERROR_FIELDS: [string, keyof RuleFormValues][] = [
  ["name:", "name"],
  ["description:", "description"],
  ["scope:", "scope"],
  ["match.hosts", "hosts"],
  ["match.hostPattern", "hostPattern"],
  ["match.pathPattern", "pathPattern"],
  ["match.hasParams", "hasParams"],
  ["match:", "hosts"],
  ["actions.setHost", "setHost"],
  ["actions.setPath", "setPath"],
  ["actions.queryMode", "queryMode"],
  ["actions.queryParams", "queryParams"],
  ["actions.setParams", "setParams"],
];

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinList(value: string[] | undefined): string {
  return (value ?? []).join(", ");
}

/** Parses the `key=value` lines of the Set Params field. */
function parseSetParams(value: string): { params: Record<string, string>; error?: string } {
  const params: Record<string, string> = {};
  for (const line of value.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      return { params, error: `"${trimmed}" is not in key=value form` };
    }
    params[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }
  return { params };
}

function formatSetParams(params: Record<string, string> | undefined): string {
  return Object.entries(params ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function ruleToFormValues(rule: UrlRule): RuleFormValues {
  return {
    name: rule.name,
    description: rule.description ?? "",
    scope: rule.scope ?? "site",
    hosts: joinList(rule.match.hosts),
    hostPattern: rule.match.hostPattern ?? "",
    pathPattern: rule.match.pathPattern ?? "",
    hasParams: joinList(rule.match.hasParams),
    setHost: rule.actions.setHost ?? "",
    setPath: rule.actions.setPath ?? "",
    queryMode: rule.actions.queryMode ?? "keepAll",
    queryParams: joinList(rule.actions.queryParams),
    setParams: formatSetParams(rule.actions.setParams),
    testUrl: "",
  };
}

/** Turns the form values into a validated rule, or into the list of problems to show the user. */
export function formValuesToRule(
  values: RuleFormValues,
  id: string,
): { ok: true; value: UrlRule } | { ok: false; errors: string[] } {
  const { params, error } = parseSetParams(values.setParams);
  if (error) {
    return { ok: false, errors: [`actions.setParams: ${error}`] };
  }

  return parseRule({
    id,
    name: values.name,
    ...(values.description.trim() ? { description: values.description } : {}),
    // "site" is the default, so leaving it out keeps an ordinary rule free of a field most users
    // never think about.
    ...(values.scope === "site" ? {} : { scope: values.scope }),
    match: {
      hosts: splitList(values.hosts),
      hostPattern: values.hostPattern,
      pathPattern: values.pathPattern,
      hasParams: splitList(values.hasParams),
    },
    actions: {
      setHost: values.setHost,
      setPath: values.setPath,
      // "keepAll" is the default, so leaving it out keeps a rule that only rewrites the path
      // from looking like it also touches the query string.
      ...(values.queryMode === "keepAll" ? {} : { queryMode: values.queryMode }),
      queryParams: splitList(values.queryParams),
      setParams: params,
    },
  });
}

/**
 * `duplicate` fills the form from an existing rule — a built-in one included — but saves it as a new
 * user rule, so the source rule keeps its own id and stays untouched.
 */
export type RuleFormMode = "create" | "edit" | "duplicate";

type RuleFormProps = {
  /** Ids already in use, so a newly created rule gets a unique one. */
  existingIds: string[];
  onSave: (rule: UrlRule) => Promise<void>;
} & ({ mode: "create"; rule?: undefined } | { mode: "edit" | "duplicate"; rule: UrlRule });

const NAVIGATION_TITLES: Record<RuleFormMode, string> = {
  create: "New URL Rule",
  edit: "Edit URL Rule",
  duplicate: "Duplicate URL Rule",
};

function initialValues(mode: RuleFormMode, rule: UrlRule | undefined): RuleFormValues {
  if (!rule) return EMPTY_VALUES;
  const values = ruleToFormValues(rule);
  return mode === "duplicate" ? { ...values, name: duplicateRuleName(rule.name) } : values;
}

export function RuleForm({ mode, rule, existingIds, onSave }: RuleFormProps) {
  const { pop } = useNavigation();
  const isEditing = mode === "edit";
  const [values, setValues] = useState<RuleFormValues>(() => initialValues(mode, rule));
  const [errors, setErrors] = useState<Partial<Record<keyof RuleFormValues, string>>>({});

  function update<K extends keyof RuleFormValues>(field: K, value: RuleFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  const preview = useMemo(() => {
    if (!values.testUrl.trim()) {
      return "Enter a URL above to see what this rule would do to it.";
    }
    const draft = formValuesToRule(values, isEditing ? rule.id : "user.preview");
    if (!draft.ok) {
      return `⚠️ The rule is not valid yet:\n${draft.errors.map((error) => `- ${error}`).join("\n")}`;
    }
    const cleaned = cleanUrl(values.testUrl.trim(), [draft.value]);
    return cleaned === values.testUrl.trim() ? `Unchanged:\n${cleaned}` : `Result:\n${cleaned}`;
  }, [values, isEditing, rule?.id]);

  async function handleSubmit() {
    const id = isEditing ? rule.id : createUserRuleId(values.name, existingIds);
    const result = formValuesToRule(values, id);

    if (!result.ok) {
      const fieldErrors: Partial<Record<keyof RuleFormValues, string>> = {};
      for (const error of result.errors) {
        const entry = ERROR_FIELDS.find(([prefix]) => error.startsWith(prefix));
        if (entry) fieldErrors[entry[1]] = error.slice(error.indexOf(":") + 1).trim();
      }
      setErrors(fieldErrors);
      await showToast({
        style: Toast.Style.Failure,
        title: "Rule is not valid",
        message: result.errors.join("\n"),
      });
      return;
    }

    await onSave(result.value);
    pop();
  }

  return (
    <Form
      navigationTitle={NAVIGATION_TITLES[mode]}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Rule" : "Create Rule"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Example: Note — drop the referrer parameter"
        value={values.name}
        error={errors.name}
        onChange={(value) => update("name", value)}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional. Shown in the rule list."
        value={values.description}
        error={errors.description}
        onChange={(value) => update("description", value)}
      />
      <Form.Dropdown
        id="scope"
        title="Scope"
        info="Site rules are tried first and only the first match runs. Global rules run afterwards on the result, and all of them apply."
        value={values.scope}
        error={errors.scope}
        onChange={(value) => update("scope", value as RuleScope)}
      >
        {RULE_SCOPES.map((scope) => (
          <Form.Dropdown.Item key={scope} value={scope} title={SCOPE_TITLES[scope]} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description
        title="Match"
        text="A rule applies only when every condition it defines matches. A site rule needs at least one host or pattern; a global rule may leave them all empty to apply to every URL. Patterns are regular expressions, always matched case-insensitively."
      />
      <Form.TextField
        id="hosts"
        title="Hosts"
        placeholder="example.com, another.example — subdomains included"
        value={values.hosts}
        error={errors.hosts}
        onChange={(value) => update("hosts", value)}
      />
      <Form.TextField
        id="hostPattern"
        title="Host Pattern"
        placeholder="Optional regular expression for the hostname"
        value={values.hostPattern}
        error={errors.hostPattern}
        onChange={(value) => update("hostPattern", value)}
      />
      <Form.TextField
        id="pathPattern"
        title="Path Pattern"
        placeholder="Optional regular expression for the path, e.g. ^/articles/(\d+)"
        value={values.pathPattern}
        error={errors.pathPattern}
        onChange={(value) => update("pathPattern", value)}
      />
      <Form.TextField
        id="hasParams"
        title="Has Params"
        placeholder="Optional. Query parameters that must all be present, e.g. v"
        value={values.hasParams}
        error={errors.hasParams}
        onChange={(value) => update("hasParams", value)}
      />

      <Form.Separator />
      <Form.Description
        title="Actions"
        text="What happens when the rule matches. Capture groups from the path pattern are available as $1, $2, ..., and the value of a query parameter as ${name}."
      />
      <Form.TextField
        id="setHost"
        title="Set Host"
        placeholder="Optional. Replaces the hostname."
        value={values.setHost}
        error={errors.setHost}
        onChange={(value) => update("setHost", value)}
      />
      <Form.TextField
        id="setPath"
        title="Set Path"
        placeholder="Optional. Replaces the path, e.g. /articles/$1"
        value={values.setPath}
        error={errors.setPath}
        onChange={(value) => update("setPath", value)}
      />
      <Form.Dropdown
        id="queryMode"
        title="Query Mode"
        value={values.queryMode}
        error={errors.queryMode}
        onChange={(value) => update("queryMode", value as QueryMode)}
      >
        {QUERY_MODES.map((mode) => (
          <Form.Dropdown.Item key={mode} value={mode} title={QUERY_MODE_TITLES[mode]} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="queryParams"
        title="Query Params"
        placeholder="utm_source, fbclid — used by Keep Only and Remove"
        value={values.queryParams}
        error={errors.queryParams}
        onChange={(value) => update("queryParams", value)}
      />
      <Form.TextArea
        id="setParams"
        title="Set Params"
        placeholder={"Optional, one key=value per line\nv=$1"}
        value={values.setParams}
        error={errors.setParams}
        onChange={(value) => update("setParams", value)}
      />

      <Form.Separator />
      <Form.TextField
        id="testUrl"
        title="Test URL"
        placeholder="Paste a URL to preview what this rule does"
        value={values.testUrl}
        onChange={(value) => update("testUrl", value)}
      />
      <Form.Description title="Preview" text={preview} />
    </Form>
  );
}
