import type { StoredAsset } from './storageAsset.ts'

import { z } from 'zod'

import { storedAssetSchema } from './storageAsset.ts'

// SDK-owned extraction is outside alphalib-sync's explicit node-sdk syncIncludes. Co-location
// reuses canonical schemas and their Types/Zod generation without adding a runtime package.

/** Server-owned Assembly identity and expected Workspace, never untrusted notification fields. */
export const storedAssemblyResultsOptionsSchema = z.object({
  assemblyId: z.string().regex(/^[A-Za-z0-9_-]+$/),
  workspace: z.string().min(1),
})

export type GetStoredAssemblyResultsOptions = z.infer<typeof storedAssemblyResultsOptionsSchema>

/** Canonical retained receipt and producing result provenance, for idempotent registration. */
export interface StoredAssemblyResult {
  assembly_id: string
  step: string
  result_id: string
  original_id?: string | (string | null)[]
  asset: StoredAsset
}

const resultSchema = storedAssetSchema.extend({
  id: z.string().min(1),
  original_id: z.union([z.string(), z.array(z.string().nullable())]).optional(),
})
const assemblySchema = z.object({
  assembly_id: z.string(),
  ok: z.string().optional(),
  error: z.string().optional(),
  results: z.record(z.array(z.record(z.unknown()))).optional(),
})

/**
 * Pure extraction from a fetched/verified Assembly bound to an authorized app upload. Validates
 * every retained result atomically; temporary outputs are ignored, partial receipts are rejected.
 * This does not authenticate notifications or check application permissions.
 */
export function extractStoredAssemblyResults(
  input: unknown,
  options: GetStoredAssemblyResultsOptions,
): StoredAssemblyResult[] {
  const { assemblyId, workspace } = storedAssemblyResultsOptionsSchema.parse(options)
  const assembly = assemblySchema.parse(input)
  if (assembly.assembly_id !== assemblyId)
    throw new Error('The response did not match the requested Assembly')
  if (assembly.error !== undefined || assembly.ok !== 'ASSEMBLY_COMPLETED')
    throw new Error(`The Storage Assembly is not complete (${assembly.error ?? assembly.ok})`)
  if (assembly.results === undefined)
    throw new Error('The completed Assembly did not contain results')
  const results: StoredAssemblyResult[] = []
  for (const [step, files] of Object.entries(assembly.results)) {
    for (const file of files) {
      if (
        file.asset_id === undefined &&
        file.version_id === undefined &&
        file.workspace === undefined
      )
        continue
      const parsed = resultSchema.safeParse(file)
      if (!parsed.success || parsed.data.workspace !== workspace) {
        throw new Error('The Assembly returned an invalid or cross-Workspace Storage result', {
          cause: { assemblyId, step },
        })
      }
      const { id, original_id, ...asset } = parsed.data
      results.push({ assembly_id: assemblyId, step, result_id: id, original_id, asset })
    }
  }
  return results
}
