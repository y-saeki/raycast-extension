# CLAUDE.md

This file provides guidance to Claude Code when working on this Raycast extension.

## Naming convention: "set" and "link"

A saved group of things to open is a **set**; one entry inside it is a **link** (a `QuicklinkTarget`
in code). Use those two words consistently — command titles, UI strings, README, `docs/`, comments,
identifiers and test descriptions. "Quicklink" on its own refers to Raycast's own feature, not to
something this extension stores, so keep it for the places that really mean Raycast's Quicklinks.

## Sets are data, never functions

A set is plain JSON conforming to `MultipleQuicklink` in `src/lib/types.ts`. It has to survive
`JSON.stringify`: it is written in a form, stored in `LocalStorage`, and read back by a second
command. Do not express a link as a function or a template that needs evaluating. When links need
behaviour the schema cannot describe, extend the schema (and its validation in
`src/lib/linkSchema.ts`, the text format in `src/lib/targetText.ts`, the form in
`src/components/QuicklinkForm.tsx`, and `docs/link-schema.md`) rather than adding an escape hatch.

## Set names are an interface, not just a label

`Open Multiple Quicklink` looks a set up by name, so a name is what every Quicklink, deeplink and
hotkey built on a set refers to. Names are therefore unique ignoring case, enforced in
`saveQuicklink`. Anything that lets two sets share a name — or that changes how a name is matched —
breaks bindings the user has already made.

## Dynamic Placeholders are deliberately out of scope

Raycast expands `{clipboard}` and friends inside Quicklinks, Snippets and AI Commands, but exposes no
API for an extension to do the same. Reimplementing them here would mean maintaining a parallel
implementation of a moving Raycast feature, so links are stored and opened verbatim. Do not add a
hand-rolled placeholder syntax; point users at a native Quicklink for that one link instead.

## Command identifiers

Each command's `name` in `package.json` must match its entry file's basename in `src/` (e.g.
`name: "open-multiple-quicklink"` ↔ `src/open-multiple-quicklink.ts`) — this is how Raycast maps
commands to files.

`src/lib/deeplink.ts` hardcodes the author, extension and command names the deeplink is built from,
and `deeplink.test.ts` asserts they still match `package.json`. Renaming any of them invalidates
every Quicklink users have already saved, so treat them as stable once released — change a `title`
for user-facing wording instead.

## Arguments are typed by hand

`ray develop` generates `Arguments.OpenMultipleQuicklink` into `raycast-env.d.ts`, which is
gitignored. CI type checks without ever running Raycast, so `src/open-multiple-quicklink.ts` declares
the argument shape itself. Keep it in step with the `arguments` in `package.json`.
