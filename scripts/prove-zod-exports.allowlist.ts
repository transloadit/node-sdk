/**
 * One accepted difference for `prove-zod-exports.ts`.
 *
 * `pattern` is a regular expression matched against the difference key: an area path such as
 * `packages/zod/dist/v4/robots/ai-chat.js`, `pack:packages/node/dist/x.js`, or a runtime key such
 * as `runtime/json-schema/input/robots/ai-chat.js:robotAiChatInstructionsSchema`.
 *
 * For files, every `normalize` replacement is applied to both sides; the entry covers the
 * difference only when the normalized contents are equal. Entries without replacements accept any
 * difference that matches, so keep them for runtime keys and give the reason.
 */
export interface ProofAllowlistEntry {
  pattern: string
  normalize: { from: string; to: string }[]
  reason: string
}

/** Differences that were reviewed and accepted. Keep this empty unless a difference is intended. */
export const proofAllowlist: ProofAllowlistEntry[] = []
