import { LocalStorage } from "@raycast/api";
import { MAX_SETS, parseQuicklinks } from "./linkSchema";
import { USER_ID_PREFIX, type MultipleQuicklink } from "./types";

const SETS_KEY = "multipleQuicklinks";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt storage should never take the extension down; fall back to defaults.
    return fallback;
  }
}

function byName(a: MultipleQuicklink, b: MultipleQuicklink): number {
  return a.name.localeCompare(b.name);
}

/**
 * Reads every saved set, in the order the list shows them. Sorting here rather than in the command
 * keeps the list, the name-collision check and the lookup by name agreeing on one order.
 */
export async function loadQuicklinks(): Promise<MultipleQuicklink[]> {
  const stored = await readJson<unknown>(SETS_KEY, []);
  return parseQuicklinks(stored).sort(byName);
}

async function writeQuicklinks(sets: MultipleQuicklink[]): Promise<void> {
  await LocalStorage.setItem(SETS_KEY, JSON.stringify(sets));
}

/** Case-insensitive lookup — what `Open Multiple Quicklink` resolves its `name` argument through. */
export async function findQuicklinkByName(name: string): Promise<MultipleQuicklink | undefined> {
  const wanted = name.trim().toLowerCase();
  return (await loadQuicklinks()).find((set) => set.name.toLowerCase() === wanted);
}

export type SaveResult = { ok: true } | { ok: false; errors: string[] };

/**
 * Creates or replaces a set.
 *
 * Names have to stay unique ignoring case: `Open Multiple Quicklink` looks a set up by name, so two
 * sets sharing one would make the deeplink — and therefore any hotkey built on it — open whichever
 * came first, which is not something the user can see or control.
 */
export async function saveQuicklink(set: MultipleQuicklink): Promise<SaveResult> {
  const sets = await loadQuicklinks();
  const name = set.name.toLowerCase();

  if (sets.some((existing) => existing.id !== set.id && existing.name.toLowerCase() === name)) {
    return { ok: false, errors: [`name: a set called "${set.name}" already exists`] };
  }

  const index = sets.findIndex((existing) => existing.id === set.id);
  if (index >= 0) {
    sets[index] = set;
  } else {
    if (sets.length >= MAX_SETS) {
      return { ok: false, errors: [`name: at most ${MAX_SETS} sets can be saved`] };
    }
    sets.push(set);
  }

  await writeQuicklinks(sets.sort(byName));
  return { ok: true };
}

export async function deleteQuicklink(id: string): Promise<void> {
  const sets = await loadQuicklinks();
  await writeQuicklinks(sets.filter((set) => set.id !== id));
}

export function createQuicklinkId(): string {
  return `${USER_ID_PREFIX}${crypto.randomUUID()}`;
}

/** Suggests a free name for a duplicate, so the uniqueness check does not reject it out of the gate. */
export function duplicateName(name: string, existingNames: string[]): string {
  const taken = new Set(existingNames.map((existing) => existing.toLowerCase()));
  const base = `${name} copy`;
  if (!taken.has(base.toLowerCase())) return base;

  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base} ${suffix}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}
