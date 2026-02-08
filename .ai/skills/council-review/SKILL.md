---
name: council-review
description:
  Run `~/code/dotfiles/bin/council.ts review` to perform a multi-model review, evaluate findings,
  fix valid issues (with tests when possible), add clarifying comments for invalid findings, then
  run required checks. Use before PR creation or when the user asks for a deep review.
---

# Council Review

## Overview

Run the local `council.ts review` script to get multi-model review findings, then triage and address
valid issues before final validation and PR creation.

## Workflow

### 1) Preflight

- Confirm the script exists and is executable: `~/code/dotfiles/bin/council.ts`.
- Do not use `--post` unless explicitly asked.
- Expect a long runtime (30+ minutes); so set any command timeout on your side to >= 45 minutes.

### 2) Run the review

- Run: `~/code/dotfiles/bin/council.ts review` from inside the repository we were working on.
- Capture the consolidated output (P0-P3 items or "No issues found.").

### 3) Triage findings

For each item:

- **Valid + worth fixing**
  - If tests exist for the area, add or extend coverage for the issue.
  - Run the test and confirm it fails.
  - Apply the fix and re-run the test to confirm it passes.
- **Invalid or not worth fixing**
  - Add a brief code comment explaining why it is safe or intentional.

### 4) Re-run review if needed

- Re-run `council.ts review` only if you made substantive changes that affect earlier findings.

### 5) Final validation

- Run repo-required checks (often `corepack yarn check` if available).
- Note any warnings but avoid unrelated changes unless required.

## Notes

- Avoid modifications while running; only edit after it finishes.
- If `council.ts review` fails, consider the errors, source code, and propose a fix for the review
  script, but do not change it, just propose it to the human
