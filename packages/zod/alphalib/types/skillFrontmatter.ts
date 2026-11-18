import { optionalWithV3Semantics } from '../lib/sdkZodOptional.ts'

import { z } from 'zod/v4'

/**
 * Zod schema for Agent Skills SKILL.md frontmatter.
 * @see https://agentskills.io/specification
 */
export const skillFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      'Lowercase alphanumeric and hyphens only; must not start/end with hyphen',
    )
    .refine((v) => !v.includes('--'), 'Must not contain consecutive hyphens'),
  description: z.string().min(1).max(1024),
  license: optionalWithV3Semantics(z.string()),
  compatibility: optionalWithV3Semantics(z.string().max(500)),
  metadata: optionalWithV3Semantics(z.record(/* @zod-v3-explicit-key */ z.string(), z.string())),
  'allowed-tools': optionalWithV3Semantics(z.string()),
})

export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>
