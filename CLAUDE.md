# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

Individual projects may add their own `CLAUDE.md` with project-specific conventions
(e.g. `raycast-url-cleaner/CLAUDE.md`). Those apply in addition to what is written here.

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
