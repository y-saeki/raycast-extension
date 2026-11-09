import { LocalStorage } from "@raycast/api";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createQuicklinkId,
  deleteQuicklink,
  duplicateName,
  findQuicklinkByName,
  loadQuicklinks,
  saveQuicklink,
} from "./quicklinkStore";
import { type MultipleQuicklink } from "./types";

function set(id: string, name: string): MultipleQuicklink {
  return { id, name, targets: [{ link: "https://example.com" }] };
}

beforeEach(async () => {
  await LocalStorage.clear();
});

describe("loadQuicklinks", () => {
  it("returns nothing before anything has been saved", async () => {
    expect(await loadQuicklinks()).toEqual([]);
  });

  it("sorts by name, so the list order never depends on when a set was created", async () => {
    await saveQuicklink(set("set-1", "Zebra"));
    await saveQuicklink(set("set-2", "Apple"));
    expect((await loadQuicklinks()).map((entry) => entry.name)).toEqual(["Apple", "Zebra"]);
  });

  it("survives corrupt storage instead of throwing", async () => {
    await LocalStorage.setItem("multipleQuicklinks", "{ not json");
    expect(await loadQuicklinks()).toEqual([]);
  });

  it("drops stored sets that no longer validate", async () => {
    await LocalStorage.setItem(
      "multipleQuicklinks",
      JSON.stringify([set("set-1", "Good"), { id: "set-2", name: "Broken", targets: [{ link: "example.com" }] }]),
    );
    expect((await loadQuicklinks()).map((entry) => entry.name)).toEqual(["Good"]);
  });
});

describe("saveQuicklink", () => {
  it("replaces a set with the same id rather than adding a second one", async () => {
    await saveQuicklink(set("set-1", "Morning"));
    await saveQuicklink({ ...set("set-1", "Morning"), targets: [{ link: "https://changed.example" }] });

    const sets = await loadQuicklinks();
    expect(sets).toHaveLength(1);
    expect(sets[0].targets[0].link).toBe("https://changed.example");
  });

  it("rejects a name another set already uses, ignoring case", async () => {
    await saveQuicklink(set("set-1", "Morning"));
    const result = await saveQuicklink(set("set-2", "morning"));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toContain("already exists");
    expect(await loadQuicklinks()).toHaveLength(1);
  });

  it("lets a set keep its own name when it is edited", async () => {
    await saveQuicklink(set("set-1", "Morning"));
    expect(await saveQuicklink(set("set-1", "Morning"))).toEqual({ ok: true });
  });
});

describe("findQuicklinkByName", () => {
  it("matches ignoring case and surrounding spaces, the way the deeplink argument arrives", async () => {
    await saveQuicklink(set("set-1", "Morning Routine"));
    expect((await findQuicklinkByName("  morning routine "))?.id).toBe("set-1");
  });

  it("returns nothing for a name no set uses", async () => {
    expect(await findQuicklinkByName("Missing")).toBeUndefined();
  });
});

describe("deleteQuicklink", () => {
  it("removes only the set asked for", async () => {
    await saveQuicklink(set("set-1", "Morning"));
    await saveQuicklink(set("set-2", "Evening"));
    await deleteQuicklink("set-1");
    expect((await loadQuicklinks()).map((entry) => entry.name)).toEqual(["Evening"]);
  });
});

describe("createQuicklinkId", () => {
  it("produces distinct prefixed ids", () => {
    const first = createQuicklinkId();
    expect(first).toMatch(/^set-/);
    expect(first).not.toBe(createQuicklinkId());
  });
});

describe("duplicateName", () => {
  it("suggests a name the uniqueness check will accept", () => {
    expect(duplicateName("Morning", ["Morning"])).toBe("Morning copy");
    expect(duplicateName("Morning", ["Morning", "morning copy"])).toBe("Morning copy 2");
    expect(duplicateName("Morning", ["Morning", "Morning copy", "Morning copy 2"])).toBe("Morning copy 3");
  });
});
