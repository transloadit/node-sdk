import type { StoredAsset } from './alphalib/types/storageAsset.ts'
import type { Transloadit } from './Transloadit.ts'

import { z } from 'zod'

import { ApiError } from './ApiError.ts'
import { robotFileServeInstructionsSchema } from './alphalib/types/robots/file-serve.ts'
import { storedAssetSchema } from './alphalib/types/storageAsset.ts'
import InconsistentResponseError from './InconsistentResponseError.ts'

/** Original-byte delivery, not a preview or transcode; authorize the application's asset first. */
export interface StoredAssetUrlOptions {
  /** True uses the receipt filename; a string supplies a different attachment filename. */
  download?: boolean | string
  /** Maximum signed lifetime, from one second to 48 hours. Defaults to five minutes. */
  lifetimeMs?: number
}

/** Signs a retained original, including non-image media, without fetching or proxying its bytes. */
export function getStoredAssetUrl(
  client: Transloadit,
  input: StoredAsset,
  options: StoredAssetUrlOptions = {},
): string {
  const asset = storedAssetSchema.parse(input)
  const lifetimeMs = options.lifetimeMs ?? 5 * 60_000
  if (!Number.isSafeInteger(lifetimeMs) || lifetimeMs < 1000 || lifetimeMs > 48 * 3600_000) {
    throw new RangeError('lifetimeMs must be an integer between 1000 and 172800000')
  }
  const download = options.download === true ? asset.path.split('/').at(-1) : options.download
  if (download !== undefined && download !== false) {
    robotFileServeInstructionsSchema.shape.download_name.unwrap().min(1).parse(download)
    if (typeof download !== 'string' || /[\uD800-\uDFFF]/u.test(download))
      throw new TypeError('download must contain a valid Unicode filename')
  }
  // Bunny includes the full query in its cache key. Rotate at most once a minute, never at
  // the lifetime boundary where rounding could issue an almost-expired grant.
  const rotationMs = Math.min(60_000, Math.floor(lifetimeMs / 2))
  const expiresAt = Math.floor(Date.now() / rotationMs) * rotationMs + lifetimeMs
  return client.getSignedSmartCDNUrl({
    workspace: asset.workspace,
    template: 'builtin/storage-serve@0.0.3',
    input: asset.asset_id,
    urlParams: { v: asset.version_id, ...(typeof download === 'string' ? { download } : {}) },
    expiresAt,
  })
}

/** Server-owned Assembly identity and expected Workspace, not values from an untrusted notification. */
export interface GetStoredAssemblyResultsOptions {
  assemblyId: string
  workspace: string
}

/** A canonical stored asset with the producing result's provenance; one input can have many outputs. */
export interface StoredAssemblyResult {
  assembly_id: string
  step: string
  result_id: string
  original_id?: string | (string | null)[]
  asset: StoredAsset
}

const requestSchema = z.object({
  assemblyId: z.string().regex(/^[A-Za-z0-9_-]+$/),
  workspace: z.string().min(1),
})
const resultSchema = storedAssetSchema.extend({
  id: z.string().min(1),
  original_id: z.union([z.string(), z.array(z.string().nullable())]).optional(),
})

/**
 * Fetches a completed Assembly and verifies all retained results, including non-image media.
 * The caller must first bind the Assembly to an authorized application upload. Register results
 * idempotently by Assembly/step/result ID (or asset/version), not by filename or notification count.
 */
export async function getStoredAssemblyResults(
  client: Transloadit,
  options: GetStoredAssemblyResultsOptions,
): Promise<StoredAssemblyResult[]> {
  const { assemblyId, workspace } = requestSchema.parse(options)
  const assembly = await client.getAssembly(assemblyId)
  if (assembly.assembly_id !== assemblyId) {
    throw new InconsistentResponseError('The response did not match the requested Assembly')
  }
  if (typeof assembly.error === 'string') throw new ApiError({ body: assembly })
  if (assembly.ok !== 'ASSEMBLY_COMPLETED') {
    throw new InconsistentResponseError(`The Storage Assembly is not complete (${assembly.ok})`)
  }
  if (assembly.results === undefined) {
    throw new InconsistentResponseError('The completed Assembly did not contain results')
  }
  const results: StoredAssemblyResult[] = []
  for (const [step, files] of Object.entries(assembly.results)) {
    for (const file of files) {
      // Ordinary temporary/exported outputs are not Storage receipts. Partial Storage records
      // must fail validation rather than disappearing from an otherwise successful batch.
      if (
        file.asset_id === undefined &&
        file.version_id === undefined &&
        file.workspace === undefined
      )
        continue
      const parsed = resultSchema.safeParse(file)
      if (!parsed.success || parsed.data.workspace !== workspace) {
        throw new InconsistentResponseError(
          'The Assembly returned an invalid or cross-Workspace Storage result',
          {
            cause: { assemblyId, step },
          },
        )
      }
      const { id, original_id, ...asset } = parsed.data
      results.push({ assembly_id: assemblyId, step, result_id: id, original_id, asset })
    }
  }
  return results
}
