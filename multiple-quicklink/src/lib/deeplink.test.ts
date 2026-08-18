import { describe, expect, it } from "vitest";
import manifest from "../../package.json";
import { AUTHOR_NAME, deeplinkForName, EXTENSION_NAME, OPEN_COMMAND_NAME } from "./deeplink";

describe("deeplinkForName", () => {
  it("targets the command that opens a set by name", () => {
    expect(deeplinkForName("Morning")).toBe(
      "raycast://extensions/y-saeki/multiple-quicklink/open-multiple-quicklink?arguments=%7B%22name%22%3A%22Morning%22%7D",
    );
  });

  it("encodes a name with spaces and symbols so the argument survives the URL", () => {
    const link = deeplinkForName('Work & "play"');
    const args = new URL(link).searchParams.get("arguments");
    expect(JSON.parse(args ?? "")).toEqual({ name: 'Work & "play"' });
  });
});

// The deeplink is assembled from constants rather than read from the manifest at runtime, so this
// guards the one thing that could silently drift: renaming the extension or the command in
// package.json without updating them here would leave every saved Quicklink pointing nowhere.
describe("the constants the deeplink is built from", () => {
  it("still match package.json", () => {
    expect(AUTHOR_NAME).toBe(manifest.author);
    expect(EXTENSION_NAME).toBe(manifest.name);
    expect(manifest.commands.map((command) => command.name)).toContain(OPEN_COMMAND_NAME);
  });
});
