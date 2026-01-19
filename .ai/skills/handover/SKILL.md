---
name: handover
description: Create or update a concise handover doc for the current repo/session.
---

# Handover doc

Create or update a handover doc for the current repo.

## Location
- If `repodocs/prompts/` exists -> use it.
- Else use `docs/prompts/`.

## Filename
- `YYYY-MM-DD-handover-<topic>.md`
- `<topic>` is auto-slugged on creation, using best available context:
  - Prefer PR title (if PR exists for current branch).
  - Else a short task/context summary (e.g., feature name, incident, or subsystem).
  - Else latest commit subject.
- If the user requests a specific slug/topic, honor it.
- On update: do not rename; update existing file unless the user requests a new file.

## Data sources
- Date: `date +%Y-%m-%d`
- Updated: `date -u +%Y-%m-%dT%H:%M:%SZ`
- Host: `hostname`
- Repo path: `pwd`
- Branch: `git rev-parse --abbrev-ref HEAD`
- HEAD: `git rev-parse HEAD`
- Git status: `git status -sb`
- PR (if available): `gh pr view --json number,title,url`

## Format (bullets only)
- Date: …
- Updated: …
- Host: …
- Repo: …
- Branch + HEAD: …
- PR: (if available) `#1234 Title (URL)`
- State:
  - clean/dirty
  - merge state (if any)
  - CI/deploy status (if relevant)
- Work done:
  - …
- Next:
  - …
- Notes:
  - …
- Git status:
  - ```text
    ## branch...origin/branch
    M file
    ```
