# Transloadit Repository Guide

This document serves as a quick reference for agentic coding assistants working in this repository.

## Check your work

After making changes, always run `corepack yarn check`, this lints with typescript, formats code,
and runs quick unit tests. Remember that this formats code and may make changes, that you are to
commit if you were working on those files.

## When running in GitHub Actions

When in running in a GitHub Actions context, always commit changes to a non-`main` branch, and never
forget to push. Even if there was an error, when in GHA context, commit your work to a branch and
push it so we can inspect it and continue in a next run.

## More important rules

Detailed guidelines are organized in the following files, read them carefully when applicable:

@.ai/rules/coding-style.mdc @.ai/rules/typescript.mdc @.ai/rules/cli-scripts.mdc
@.ai/rules/general.mdc @.ai/rules/repo.mdc
