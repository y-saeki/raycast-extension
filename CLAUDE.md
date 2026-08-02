# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

Individual projects may add their own `CLAUDE.md` with project-specific conventions
(e.g. `url-cleaner/CLAUDE.md`). Those apply in addition to what is written here.

## Check the official Raycast documentation

Anything that depends on how Raycast itself behaves — manifest fields, what an API returns, which
APIs exist, store requirements, platform differences — is settled by reading
<https://developers.raycast.com/>, not by recalling it or inferring it from the code already here.
Raycast ships often and the API surface moves with it, so a habit that was correct a few releases
ago may no longer be. The pages worth reaching for first:

- [Manifest](https://developers.raycast.com/information/manifest) — every `package.json` field,
  including which are required
- [API Reference](https://developers.raycast.com/api-reference/) — what a given API actually offers
- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
  — the review checklist
- [Changelog](https://developers.raycast.com/misc/changelog) — which release introduced a feature,
  which matters when deciding whether the pinned `@raycast/api` version already has it

This applies to every task in this repository, not just ones that mention Raycast versions.

## One directory per extension, no `raycast-` prefix

This repository holds only Raycast extensions, one per directory at the repository root.
Name each directory after the extension itself — `url-cleaner`, not `raycast-url-cleaner`.
The `raycast-` prefix repeats what the repository name already says, so leave it off.

## Write issues and pull requests in Japanese

GitHub issues and pull requests — titles and bodies alike — are written in Japanese.
This applies to issues you file, pull requests you open, and edits to existing ones.

Everything inside the codebase stays as it is today: code, identifiers, code comments and
commit messages are English, while user-facing documentation (`README.md`, `docs/`) and
strings shown to the user are Japanese. This convention is only about issues and pull requests.

## Link pull requests to the issue they close

A pull request that comes from an issue opens its body with a closing reference to that issue,
on its own line, before anything else:

```
Closes #11
```

Prefer `Closes`; `Fixes` and `Resolves` behave the same way. Write the keyword in English even
though the rest of the body is Japanese — GitHub only recognises the English form, so this is
the one exception to the rule above.

The keyword only works for issues in the same repository, and it closes the issue when the pull
request is merged. Reference an issue that should stay open — or one in another repository —
without a keyword instead (`Refs #12`). A pull request with no originating issue gets no such line.

## Keep the pull request body in step with the branch

A pull request body describes the branch as it stands, not as it stood when the pull request was
opened. After pushing further commits to a branch that already has one, re-read the body and
update it — the title too, when the scope of the change moved. Renames, reversed decisions and
work added on review feedback all belong there; a typo fix or a formatting-only commit usually
changes nothing worth writing down.

This holds however the pull request was created, including ones opened from the Claude Code UI
rather than by you.
