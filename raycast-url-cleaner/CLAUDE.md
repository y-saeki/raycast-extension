# CLAUDE.md

This file provides guidance to Claude Code when working on this Raycast extension.

## Naming convention: "URL", not "Link"

The extension is named **URL Cleaner**. Use "URL" consistently everywhere — command titles/descriptions, preference text, README, `docs/`, code comments, variable/function names, and test descriptions. Do not use "Link" as a synonym for URL anywhere in this project.

## Command identifiers

Each command's `name` in `package.json` must match its entry file's basename in `src/` (e.g. `name: "url-cleaner"` ↔ `src/url-cleaner.ts`) — this is how Raycast maps commands to files.

Once this extension has real users with saved hotkeys/preferences (in particular once published to the Raycast Store), renaming a command's `name` breaks those bindings, since Raycast treats it as a new command. Treat `name` as stable after that point — change the `title` for user-facing wording instead. During early local-only development (as now), renaming `name` is fine and cheap.
