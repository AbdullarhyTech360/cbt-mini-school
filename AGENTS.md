# Git Workflow

This project uses **Conventional Commits** and a **hybrid branching** strategy.
A `prepare-commit-msg` hook in `.githooks/` enforces the commit format.

## Commit format

```
type(scope): subject
```

- `type`: `feat | fix | refactor | chore | style | docs | test | perf | build | ci | revert`
- `scope`: optional, lowercase — e.g. `auth`, `report`, `migrations`
- `subject`: imperative, lowercase, under 72 chars
- Add a body (blank line, then *why*) for anything non-trivial

Examples:

```
feat(auth): add password reset flow
fix(report): correct class average calculation
refactor(routes): extract admin actions into modules
```

## Branching (hybrid)

- **Tiny fixes** (a few lines, under ~15 min): commit straight to `main`.
- **Features, fixes, refactors** (multi-file or >1 hour): short-lived branches,
  merged back when they work and deleted.

```
git switch -c feat/add-question-bank     # or fix/, refactor/
# ... small logical commits ...
git switch main
git merge feat/add-question-bank
git branch -d feat/add-question-bank
```

## Habits

- **Commit when a logical unit of work passes** — not at end of day.
- **One concern per commit.** If unrelated edits are mixed, stage selectively:
  `git add -p`.
- **Amend freely** before pushing; never rewrite shared history.
- Re-run `bash scripts/install_git_hooks.sh` after cloning to activate hooks.

## Aliases

`git ac "msg"` stages everything and commits; `git amend`, `git unstage`,
`git co`, `git br`, `git fixup <sha>`, `git latest`.
