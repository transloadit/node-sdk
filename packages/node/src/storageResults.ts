import type { StoredAsset } from './alphalib/types/storageAsset.ts'
import type {
  GetStoredAssemblyResultsOptions,
  StoredAssemblyResult,
} from './alphalib/types/storageResults.ts'
import type { Transloadit } from './Transloadit.ts'

import { ApiError } from './ApiError.ts'
import { robotFileServeInstructionsSchema } from './alphalib/types/robots/file-serve.ts'
import { storedAssetSchema } from './alphalib/types/storageAsset.ts'
import {
  extractStoredAssemblyResults,
  storedAssemblyResultsOptionsSchema,
} from './alphalib/types/storageResults.ts'
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

export type {
  GetStoredAssemblyResultsOptions,
  StoredAssemblyResult,
} from './alphalib/types/storageResults.ts'

/**
 * Fetches a completed Assembly and verifies all retained results, including non-image media.
 * The caller must first bind the Assembly to an authorized application upload. Register results
 * idempotently by Assembly/step/result ID (or asset/version), not by filename or notification count.
 */
export async function getStoredAssemblyResults(
  client: Transloadit,
  options: GetStoredAssemblyResultsOptions,
): Promise<StoredAssemblyResult[]> {
  const { assemblyId, workspace } = storedAssemblyResultsOptionsSchema.parse(options)
  const assembly = await client.getAssembly(assemblyId)
  if (assembly.assembly_id !== assemblyId) {
    throw new InconsistentResponseError('The response did not match the requested Assembly')
  }
  if (typeof assembly.error === 'string') throw new ApiError({ body: assembly })
  try {
    return extractStoredAssemblyResults(assembly, { assemblyId, workspace })
  } catch (error) {
    // Keep the Node SDK error contract while sharing strict extraction with Web runtimes.
    if (!(error instanceof Error)) throw new Error('Invalid Assembly response', { cause: error })
    throw new InconsistentResponseError(error.message, { cause: error.cause ?? error })
  }
}
