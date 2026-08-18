import { homedir } from "node:os";
import { describe, expect, it } from "vitest";
import { openTargets, summarize } from "./openTargets";
import { type QuicklinkTarget } from "./types";

function recorder(failOn: string[] = []) {
  const calls: string[] = [];
  return {
    calls,
    dependencies: {
      open: async (target: string, application?: string) => {
        if (failOn.includes(target)) throw new Error("could not be opened");
        calls.push(application ? `${target} -> ${application}` : target);
      },
      wait: async () => {
        calls.push("wait");
      },
    },
  };
}

const targets: QuicklinkTarget[] = [
  { link: "https://first.example" },
  { link: "https://second.example", application: "Google Chrome" },
  { link: "/Users/me/notes.md" },
];

describe("openTargets", () => {
  it("opens the targets in order, pausing between them", async () => {
    const { calls, dependencies } = recorder();
    const summary = await openTargets(targets, dependencies);

    expect(calls).toEqual([
      "https://first.example",
      "wait",
      "https://second.example -> Google Chrome",
      "wait",
      "/Users/me/notes.md",
    ]);
    expect(summary).toEqual({ opened: 3, failures: [] });
  });

  it("does not pause before the first target or after the last", async () => {
    const { calls, dependencies } = recorder();
    await openTargets([{ link: "https://only.example" }], dependencies);
    expect(calls).toEqual(["https://only.example"]);
  });

  it("expands a tilde path on the way to open", async () => {
    const { calls, dependencies } = recorder();
    await openTargets([{ link: "~/notes.md" }], dependencies);
    expect(calls).toEqual([`${homedir()}/notes.md`]);
  });

  it("keeps opening the rest after one target fails, and reports the failure", async () => {
    const { calls, dependencies } = recorder(["https://second.example"]);
    const summary = await openTargets(targets, dependencies);

    expect(calls).toEqual(["https://first.example", "wait", "wait", "/Users/me/notes.md"]);
    expect(summary.opened).toBe(2);
    expect(summary.failures).toHaveLength(1);
    expect(summary.failures[0].target.link).toBe("https://second.example");
    expect(summary.failures[0].message).toBe("could not be opened");
  });
});

describe("summarize", () => {
  it("counts the links when every one opened", () => {
    expect(summarize({ opened: 1, failures: [] }, 1)).toBe("Opened 1 link");
    expect(summarize({ opened: 3, failures: [] }, 3)).toBe("Opened 3 links");
  });

  it("says how many failed when some did", () => {
    const failures = [{ target: { link: "https://example.com" }, message: "nope" }];
    expect(summarize({ opened: 2, failures }, 3)).toBe("Opened 2 of 3 links — 1 failed");
  });
});
