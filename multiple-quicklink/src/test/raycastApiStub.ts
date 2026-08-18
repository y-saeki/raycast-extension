/**
 * Stand-in for `@raycast/api` used by the unit tests.
 *
 * The real package has no entry point outside Raycast — it is injected into the bundle at runtime —
 * so Vitest cannot import it. `vitest.config.ts` aliases `@raycast/api` to this module, which
 * implements just enough of the API for the storage layer to be tested in plain Node.
 */

/** Backing store, exposed so tests can reset and inspect it. */
export const localStorageContents = new Map<string, string>();

export const LocalStorage = {
  async getItem<T extends string | number | boolean>(key: string): Promise<T | undefined> {
    return localStorageContents.get(key) as T | undefined;
  },
  async setItem(key: string, value: string | number | boolean): Promise<void> {
    localStorageContents.set(key, String(value));
  },
  async removeItem(key: string): Promise<void> {
    localStorageContents.delete(key);
  },
  async clear(): Promise<void> {
    localStorageContents.clear();
  },
};

/**
 * `openTargets` imports `open` at module level and takes the real one as its default dependency, so
 * the import has to resolve even though every test passes its own opener in.
 */
export async function open(): Promise<void> {
  throw new Error("open() is not available outside Raycast; pass a stub dependency instead");
}
