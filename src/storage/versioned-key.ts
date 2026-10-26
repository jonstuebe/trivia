import * as z from "zod";
import type { StorageBackend } from "./backend";

/**
 * One stored value, kept as `{version, data}`. On read the data is stepped up
 * through migrations to the current version and checked against the schema.
 * A value that can't be read (corrupt, or written by a newer app version) is
 * backed up or dropped, and the key starts fresh, so a bad value never stops
 * the game.
 */
export interface VersionedKey<T> {
  /** The stored data, or the initial value when nothing usable is stored. */
  read(): T;
  /** Stores `data` at the current version. */
  write(data: T): void;
  /** Removes the stored value, so the next read gives the initial value. */
  clear(): void;
}

/** How one versioned key is stored, checked and stepped up. */
export interface VersionedKeyOptions<T> {
  /** The storage key, like `trivia.seen`. */
  name: string;
  /** The current version of the data's shape: a whole number from 1. */
  version: number;
  /** The current shape, checked on every read. */
  schema: z.ZodType<T>;
  /** What the key holds when nothing usable is stored. */
  initial: () => NoInfer<T>;
  /**
   * How to step the data up one version: `migrations[n]` turns version `n`
   * data into version `n + 1`. Every version below the current one needs one.
   */
  migrations?: Record<number, Migration>;
  /**
   * What happens to a value that can't be read: `backup` (the default) copies
   * the raw value to `<name>.backup` so nothing is silently lost; `drop` just
   * removes it.
   */
  unreadable?: "backup" | "drop";
}

/** Turns one version's data into the next version's. */
export type Migration = (data: unknown) => unknown;

/** The suffix on the key that keeps an unreadable value's raw text. */
export const BACKUP_SUFFIX = ".backup";

const envelopeSchema = z.object({ version: z.int().min(1), data: z.unknown() });

/** Opens one stored value under `options.name`; see `VersionedKey` for how reads, writes and bad values behave. */
export function createVersionedKey<T>(backend: StorageBackend, options: VersionedKeyOptions<T>): VersionedKey<T> {
  const { name, version, schema, initial, migrations = {}, unreadable = "backup" } = options;

  function parse(raw: string): { ok: true; data: T } | { ok: false } {
    try {
      const envelope = envelopeSchema.safeParse(JSON.parse(raw));
      if (!envelope.success || envelope.data.version > version) return { ok: false };
      let data = envelope.data.data;
      for (let from = envelope.data.version; from < version; from++) {
        const migrate = migrations[from];
        if (!migrate) return { ok: false };
        data = migrate(data);
      }
      const result = schema.safeParse(data);
      return result.success ? { ok: true, data: result.data } : { ok: false };
    } catch {
      // Not JSON, or a migration that couldn't handle what it was given.
      return { ok: false };
    }
  }

  return {
    read() {
      const raw = backend.getItem(name);
      if (raw === null) return initial();
      const result = parse(raw);
      if (result.ok) return result.data;
      if (unreadable === "backup") backend.setItem(name + BACKUP_SUFFIX, raw);
      backend.removeItem(name);
      return initial();
    },
    write(data) {
      backend.setItem(name, JSON.stringify({ version, data }));
    },
    clear() {
      backend.removeItem(name);
    },
  };
}
