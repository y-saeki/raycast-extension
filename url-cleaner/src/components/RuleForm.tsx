import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { cleanUrl } from "../lib/cleanUrl";
import {
  EMPTY_VALUES,
  fieldErrorsFor,
  formValuesToRule,
  ruleToFormValues,
  type RuleFormValues,
} from "../lib/ruleFormValues";
import { createUserRuleId, duplicateRuleName } from "../lib/ruleStore";
import { QUERY_MODES, RULE_SCOPES, type QueryMode, type RuleScope, type UrlRule } from "../rules/types";

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

  /**
   * Everything a control needs to be bound to one field. Deriving the control's `id` from the field
   * name means the two can no longer drift apart.
   */
  function fieldProps<K extends keyof RuleFormValues>(field: K) {
    return {
      id: field,
      value: values[field],
      error: errors[field],
      onChange: (value: string) => update(field, value as RuleFormValues[K]),
    };
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
      setErrors(fieldErrorsFor(result.errors));
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
      <Form.TextField {...fieldProps("name")} title="Name" placeholder="Example: Note — drop the referrer parameter" />
      <Form.TextField
        {...fieldProps("description")}
        title="Description"
        placeholder="Optional. Shown in the rule list."
      />
      <Form.Dropdown
        {...fieldProps("scope")}
        title="Scope"
        info="Site rules are tried first and only the first match runs. Global rules run afterwards on the result, and all of them apply."
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
        {...fieldProps("hosts")}
        title="Hosts"
        placeholder="example.com, another.example — subdomains included"
      />
      <Form.TextField
        {...fieldProps("hostPattern")}
        title="Host Pattern"
        placeholder="Optional regular expression for the hostname"
      />
      <Form.TextField
        {...fieldProps("pathPattern")}
        title="Path Pattern"
        placeholder="Optional regular expression for the path, e.g. ^/articles/(\d+)"
      />
      <Form.TextField
        {...fieldProps("hasParams")}
        title="Has Params"
        placeholder="Optional. Query parameters that must all be present, e.g. v"
      />

      <Form.Separator />
      <Form.Description
        title="Actions"
        text="What happens when the rule matches. Capture groups from the path pattern are available as $1, $2, ..., and the value of a query parameter as ${name}."
      />
      <Form.TextField {...fieldProps("setHost")} title="Set Host" placeholder="Optional. Replaces the hostname." />
      <Form.TextField
        {...fieldProps("setPath")}
        title="Set Path"
        placeholder="Optional. Replaces the path, e.g. /articles/$1"
      />
      <Form.Dropdown {...fieldProps("queryMode")} title="Query Mode">
        {QUERY_MODES.map((queryMode) => (
          <Form.Dropdown.Item key={queryMode} value={queryMode} title={QUERY_MODE_TITLES[queryMode]} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        {...fieldProps("queryParams")}
        title="Query Params"
        placeholder="utm_source, fbclid — used by Keep Only and Remove"
      />
      <Form.TextArea
        {...fieldProps("setParams")}
        title="Set Params"
        placeholder={"Optional, one key=value per line\nv=$1"}
      />

      <Form.Separator />
      <Form.TextField
        {...fieldProps("testUrl")}
        title="Test URL"
        placeholder="Paste a URL to preview what this rule does"
      />
      <Form.Description title="Preview" text={preview} />
    </Form>
  );
}
