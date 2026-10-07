---
name: gh-pr-to-green
description:
  Finish a GitHub PR by using gh to gather full PR context, addressing open review comments (err on
  the side of fixing), running council-review and the repo-required checks (often `yarn check`),
  pushing updates, and monitoring CI until green. Only runs when a human explicitly invokes it.
disable-model-invocation: true
---

# GH PR to Green

## Workflow

- Get context from PR with `gh`; make sure all review comments, threads, CI failures, and PR
  description updates are included, and track them as a todo list in your session (do not commit
  it).
- Merge the latest main into our branch and resolve any conflict carefully.
- Determine which review items are correct.
- Keep working until all items are checked off, either by fixing the issue, or explaining why not in
  a PR comment or a code comment where applicable/sensible.
- Invoke `council-review`
- If the PR has UI/UX impact, invoke `claude-usertest` instead of duplicating browser-test
  instructions here. Treat its output as reviewer input, reconcile findings yourself, and fold valid
  fixes back into this PR-to-green loop.
- Run the repo-required checks (often `yarn check`).
- Fix any issue that you deem related and worth fixing.
- Commit as you go, but push once per round: every push starts a full CI run, and in api2 a newer
  push does not cancel the run for the commit it superseded. Cancel those superseded runs
  (`gh run cancel`).
- Monitor CI until green with the repo's `gh-run-watch.ts` when it exists (api2:
  `core/alphalib/bin/gh-run-watch.ts`, content: `_scripts/alphalib/bin/gh-run-watch.ts`), else
  `gh run watch`.
- Fix any issue that you deem related and worth fixing, then push and watch again until CI is green
  or only 100% unrelated issues remain. Merge main again only for conflicts or a fix that main
  carries.

This skill is PR orchestration only. Do not add inline UX/browser/user-test instructions here; use
dedicated validation skills for those workflows.

Report back with a list of all changes made, and offer a link to the PR for inspection and merge.
Offer to squash merge with `--admin` if the human thinks a last manual review is not needed.
