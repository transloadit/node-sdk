# Transloadit Agent Skills Plan

## Goals

- Provide a lightweight, skills-based way for agents to use Transloadit without bespoke MCP plumbing.
- Package repeatable, high-quality workflows and integration guidance as portable skills.
- Keep skills composable and low-context via progressive disclosure and optional resources.

## Background (from Agent Skills ecosystem)

- Skills are directories that minimally include a `SKILL.md` file, with optional `scripts/`, `references/`, and `assets/` folders. citeturn2view0
- `SKILL.md` requires YAML frontmatter with `name` and `description`, plus optional fields like `compatibility`, `metadata`, and experimental `allowed-tools`. citeturn2view0
- Skills are designed around progressive disclosure: metadata is loaded at startup, the main instructions on activation, and extra resources only when needed. citeturn2view0turn3view1
- Skills can be used by filesystem-based agents (reading files directly) or tool-based agents that expose explicit skill tools. citeturn2view1
- Skills are installable via the skills CLI: `npx skills add <owner/repo>`. citeturn0view0turn1view0

## Skill taxonomy (proposed)

Your two categories are a great baseline. I recommend adding one more to cover operational reality:

1) **Integration skills** (SDK/framework-focused)
- Examples: `transloadit-node`, `transloadit-react`, `transloadit-uppy`, `transloadit-go`, `transloadit-ios`, `transloadit-s3-direct`, `transloadit-webhooks`.
- Focus: “how to integrate,” code snippets, expected inputs/outputs, common pitfalls.

2) **Run Transloadit directly** (agent-driven workflows)
- Examples: `transloadit-encode-video`, `transloadit-generate-preview`, `transloadit-doc-ocr`, `transloadit-audio-normalize`, `transloadit-image-variants`.
- Focus: “do the job,” standard assembly templates, required fields, and validation/linting.

3) **Ops & diagnostics** (account and system reliability)
- Examples: `transloadit-auth-and-tokens`, `transloadit-mcp-hosted`, `transloadit-debug-assembly`, `transloadit-webhook-troubleshooting`, `transloadit-cost-estimation`.
- Focus: credentials, auth modes, debugging, production hygiene.

This third category solves: “it works locally but not in prod,” “how do I authorize,” and “why did my assembly fail?”—the most common operational requests.

## Candidate skills (initial backlog)

### Integration skills
- **transloadit-node**: install, auth, create assembly, await results, resume uploads.
- **transloadit-uppy**: configuration recipes, common step combos, Tus behavior.
- **transloadit-react**: client-side flow patterns and UX guidance.
- **transloadit-webhooks**: signature verification, retry patterns, test harness.

### Run Transloadit directly
- **transloadit-encode-video**: inputs, recommended steps, output format presets.
- **transloadit-image-variants**: resize/crop/watermark, responsive sets.
- **transloadit-preview-file**: fast previews for docs/video/audio.
- **transloadit-ocr-docs**: PDF/scan OCR with extraction notes.

### Ops & diagnostics
- **transloadit-auth-and-tokens**: key/secret vs bearer, signed requests, rotation.
- **transloadit-debug-assembly**: reading assembly status, failure triage.
- **transloadit-mcp-hosted**: hosted vs local MCP, file input constraints.
- **transloadit-cost-estimation**: best-effort cost checks and usage hints.

## Implementation approach

- Create a dedicated skills repo (e.g., `transloadit/agent-skills`) with one folder per skill.
- Follow the Agent Skills spec:
  - `SKILL.md` with required frontmatter and tight, task-centric instructions. citeturn2view0
  - Keep `SKILL.md` short and move details to `references/` for progressive disclosure. citeturn2view0turn3view1
  - Use `scripts/` sparingly for deterministic tasks (e.g., linting, assembly validation). citeturn2view0
  - Use `allowed-tools` only if needed and keep it minimal. citeturn2view0

## Rollout plan

1) **Phase 1 (Core)**
   - `transloadit-node`
   - `transloadit-encode-video`
   - `transloadit-debug-assembly`

2) **Phase 2 (Breadth)**
   - `transloadit-uppy`
   - `transloadit-image-variants`
   - `transloadit-auth-and-tokens`

3) **Phase 3 (Ops)**
   - `transloadit-mcp-hosted`
   - `transloadit-webhooks`
   - `transloadit-cost-estimation`

## Open questions

- Where should the skills live long-term: this repo vs a dedicated `agent-skills` repo?
- Should we version skills independently from SDK releases?
- Do we want “composite skills” that orchestrate MCP + SDK + scripts together?

