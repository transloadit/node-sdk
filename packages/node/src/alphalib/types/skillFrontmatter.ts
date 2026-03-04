import { z } from 'zod'

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
  license: z.string().optional(),
  compatibility: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  'allowed-tools': z.string().optional(),
})

export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>
