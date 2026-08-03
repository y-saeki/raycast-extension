import type { QueryMode, RuleScope, UrlRule } from "../rules/types";
import { parseRule } from "./ruleSchema";

/**
 * The rule form's state: every field is a string, because that is what a Raycast `Form` control
 * holds. Converting to and from `UrlRule` lives here rather than in the component, so it can be
 * tested without rendering anything.
 */
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

export const EMPTY_VALUES: RuleFormValues = {
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

/** Assigns each validation error to the field it belongs to, stripped of its `field:` prefix. */
export function fieldErrorsFor(errors: string[]): Partial<Record<keyof RuleFormValues, string>> {
  const fieldErrors: Partial<Record<keyof RuleFormValues, string>> = {};
  for (const error of errors) {
    const entry = ERROR_FIELDS.find(([prefix]) => error.startsWith(prefix));
    if (entry) fieldErrors[entry[1]] = error.slice(error.indexOf(":") + 1).trim();
  }
  return fieldErrors;
}

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
