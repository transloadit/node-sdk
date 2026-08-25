# @transloadit/utils

## 4.5.1

### Patch Changes

- 85a0bbd: Replace the two-day-old Smart CDN candidate return value with structured sources for
  renderer-independent integrations. The only application consumer migrates with this release.

## 4.5.0

### Minor Changes

- 1565012: Add deterministic signed responsive-image candidates for Smart CDN.

## 4.4.1

### Patch Changes

- 507ec7f: Use GPT-5.6 Sol for OpenAI defaults, Claude Fable 5 for general Anthropic defaults, and Claude
  Sonnet 5 for image descriptions. Keep end-user Assembly Instructions compilation at medium
  reasoning for responsive generation.

## 4.4.0

### Minor Changes

- c2de344: Add a shared Assembly Instructions compiler and expose prompt-to-Assembly-Instructions helpers in
  the Node SDK and CLI.

## 4.3.0

## 4.2.0

## 4.1.9

## 4.1.8

## 4.1.7

### Patch Changes

- d443386: Add shared signature helpers in @transloadit/utils and reuse them in the Node SDK.
