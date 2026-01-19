---
name: big-review
description:
  Run ~/code/dotfiles/bin/review.sh to perform a multi-model review, evaluate findings, fix valid
  issues (with tests when possible), add clarifying comments for invalid findings, then run required
  checks. Use before PR creation or when the user asks for a deep review.
---

# Big Review

## Overview

Run the local `review.sh` script to get multi-model review findings, then triage and address valid
issues before final validation and PR creation.

## Workflow

### 1) Preflight

- Confirm the script exists and is executable: `~/code/dotfiles/bin/review.sh`.
- Ensure `gh`, `gemini`, `claude`, `codex`, `jq`, and `script` are available (the script checks
  this).
- Do not use `--post` unless explicitly asked.
- Expect a long runtime (15+ minutes); set any command timeout to >= 30 minutes.

### 2) Run the review

- Run: `~/code/dotfiles/bin/review.sh`.
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

- Re-run `review.sh` only if you made substantive changes that affect earlier findings.

### 5) Final validation

- Run repo-required checks (for this repo: `corepack yarn check`).
- Note any warnings but avoid unrelated changes unless required.

## Notes

- The review script already forbids modifications while running; only edit after it finishes.
- If `review.sh` fails (missing tools or empty output), fall back to manual review and proceed.
