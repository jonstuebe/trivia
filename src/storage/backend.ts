/**
 * Where device storage keeps its keys: `window.localStorage` in the browser,
 * an in-memory one in tests.
 */
export type StorageBackend = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** A backend that keeps everything in memory, for tests. */
export function createMemoryBackend(entries: Record<string, string> = {}): StorageBackend & {
  keys(): string[];
} {
  const items = new Map(Object.entries(entries));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, String(value)),
    removeItem: (key) => void items.delete(key),
    keys: () => [...items.keys()],
  };
}
