import * as z from "zod";
import { describe, expect, it } from "vitest";
import { createMemoryBackend } from "./backend";
import { createVersionedKey } from "./versioned-key";

const counterKey = (backend = createMemoryBackend()) =>
  createVersionedKey(backend, {
    name: "test.counter",
    version: 1,
    schema: z.object({ count: z.number() }),
    initial: () => ({ count: 0 }),
  });

describe("a versioned key", () => {
  it("starts from its initial value when nothing is stored", () => {
    expect(counterKey().read()).toEqual({ count: 0 });
  });

  it("stores its data in a {version, data} envelope and reads it back", () => {
    const backend = createMemoryBackend();
    counterKey(backend).write({ count: 3 });
    expect(JSON.parse(backend.getItem("test.counter")!)).toEqual({ version: 1, data: { count: 3 } });
    expect(counterKey(backend).read()).toEqual({ count: 3 });
  });
});

describe("migrations", () => {
  // Version 1 stored a bare number, version 2 wrapped it, version 3 renamed the field.
  const migratedKey = (backend: ReturnType<typeof createMemoryBackend>) =>
    createVersionedKey(backend, {
      name: "test.counter",
      version: 3,
      schema: z.object({ total: z.number() }),
      initial: () => ({ total: 0 }),
      migrations: {
        1: (data) => ({ count: data }),
        2: (data) => ({ total: (data as { count: number }).count }),
      },
    });

  it("steps old data up through every migration to the current version", () => {
    const backend = createMemoryBackend({ "test.counter": JSON.stringify({ version: 1, data: 7 }) });
    expect(migratedKey(backend).read()).toEqual({ total: 7 });
  });

  it("starts part way along when the data is from a middle version", () => {
    const backend = createMemoryBackend({ "test.counter": JSON.stringify({ version: 2, data: { count: 4 } }) });
    expect(migratedKey(backend).read()).toEqual({ total: 4 });
  });
});

describe("a value that can't be read", () => {
  const unreadable = {
    "not JSON": "{oops",
    "not an envelope": JSON.stringify({ count: 3 }),
    "a version that isn't a whole number": JSON.stringify({ version: "1", data: { count: 3 } }),
    "written by a newer app version": JSON.stringify({ version: 2, data: { count: 3 } }),
    "data that fails the schema": JSON.stringify({ version: 1, data: { count: "three" } }),
  };

  it.each(Object.entries(unreadable))("is copied to a backup key and the key starts fresh: %s", (_, raw) => {
    const backend = createMemoryBackend({ "test.counter": raw });
    expect(counterKey(backend).read()).toEqual({ count: 0 });
    expect(backend.getItem("test.counter.backup")).toBe(raw);
    expect(backend.getItem("test.counter")).toBeNull();
  });

  it("is backed up when an old version has no migration", () => {
    const raw = JSON.stringify({ version: 1, data: { count: 3 } });
    const backend = createMemoryBackend({ "test.counter": raw });
    const key = createVersionedKey(backend, {
      name: "test.counter",
      version: 2,
      schema: z.object({ count: z.number() }),
      initial: () => ({ count: 0 }),
    });
    expect(key.read()).toEqual({ count: 0 });
    expect(backend.getItem("test.counter.backup")).toBe(raw);
  });

  it("is just dropped when the key says so", () => {
    const backend = createMemoryBackend({ "test.counter": "{oops" });
    const key = createVersionedKey(backend, {
      name: "test.counter",
      version: 1,
      schema: z.object({ count: z.number() }),
      initial: () => ({ count: 0 }),
      unreadable: "drop",
    });
    expect(key.read()).toEqual({ count: 0 });
    expect(backend.keys()).toEqual([]);
  });

  it("leaves the fresh value writable", () => {
    const backend = createMemoryBackend({ "test.counter": "{oops" });
    const key = counterKey(backend);
    key.read();
    key.write({ count: 1 });
    expect(key.read()).toEqual({ count: 1 });
    expect(backend.getItem("test.counter.backup")).toBe("{oops");
  });
});
