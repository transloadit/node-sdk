import type { AssemblyStatus } from './alphalib/types/assemblyStatus.ts'
import type { StoredAsset } from './alphalib/types/storageAsset.ts'
import type { CreateAssemblyOptions, Transloadit } from './Transloadit.ts'

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'

import debug from 'debug'
import { z } from 'zod'

import { ApiError } from './ApiError.ts'
import { storedAssetSchema } from './alphalib/types/storageAsset.ts'
import InconsistentResponseError from './InconsistentResponseError.ts'

/**
 * Verified Storage metadata that can be saved and passed directly to an image renderer.
 * Width and height reflect EXIF auto-orientation, matching Storage preview delivery.
 */
export interface StoredImageReceipt extends Readonly<StoredAsset> {
  /** Optional metadata indicating that the original has an alpha channel. */
  readonly hasAlpha?: boolean
  readonly height: number
  readonly md5hash: string
  /** Optional base64 ThumbHash of the original pixels, for an inline blur placeholder. */
  readonly thumbhash?: string
  readonly width: number
}

/** One explicit destination, with the existing Assembly upload and polling controls. */
export interface StoreImageOptions
  extends Pick<
    CreateAssemblyOptions,
    'chunkSize' | 'onAssemblyProgress' | 'onUploadProgress' | 'signal' | 'timeout'
  > {
  /** Complete relative Storage filename. Directories and interpolation expressions are rejected. */
  path: string
  /** Explicit opt-in replacement of an existing path; defaults to false. */
  overwrite?: boolean
  /** Observe verified metadata. Not awaited; sync and async observer errors cannot undo a write. */
  onReceipt?: (
    receipt: StoredImageReceipt,
    input: StoredImageExpectation,
    assemblyId: string | undefined,
  ) => void | Promise<void>
}

/** Trusted upload facts used to correlate a stored result with an application-owned upload. */
export interface StoredImageExpectation {
  path: string
  size: number
  md5hash: string
}

/** Recovers one original's receipt without re-uploading or trusting notification payloads. */
export interface GetStoredImageReceiptOptions {
  assemblyId: string
  expected: StoredImageExpectation
}

const positiveIntegerSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const receiptRequestSchema = z.object({
  assemblyId: z.string().regex(/^[A-Za-z0-9_-]+$/),
  expected: z.object({
    path: z.string(),
    size: positiveIntegerSchema,
    md5hash: z.string().regex(/^[a-f0-9]{32}$/),
  }),
})
const completedImageSchema = z.object({
  ok: z.literal('ASSEMBLY_COMPLETED'),
  results: z.object({
    ':original': z.tuple([
      storedAssetSchema.extend({
        md5hash: storedAssetSchema.shape.md5hash.unwrap(),
        height: positiveIntegerSchema,
        width: positiveIntegerSchema,
        size: positiveIntegerSchema,
      }),
    ]),
  }),
})

function validateDestination(path: string): void {
  if (
    typeof path !== 'string' ||
    path.trim() !== path ||
    Buffer.byteLength(path) > 1024 ||
    path.normalize('NFC') !== path ||
    /[\p{Cc}\p{Cs}\\|]/u.test(path) ||
    path.includes('${') ||
    path.split('/').some((segment) => segment.trim() === '' || segment === '.' || segment === '..')
  ) {
    throw new TypeError('Storage path must be a complete relative filename without interpolation')
  }
}

/** Stores one original without overwriting; receipt validation occurs after the Storage write. */
export async function storeImage(
  client: Transloadit,
  filePath: string,
  options: StoreImageOptions,
): Promise<StoredImageReceipt> {
  const {
    path,
    chunkSize,
    onAssemblyProgress,
    onUploadProgress,
    onReceipt,
    overwrite,
    signal,
    timeout,
  } = options
  validateDestination(path)
  if (overwrite !== undefined && typeof overwrite !== 'boolean')
    throw new TypeError('overwrite must be a boolean')
  signal?.throwIfAborted()
  const checksum = createHash('md5')
  let size = 0
  for await (const chunk of createReadStream(filePath, { signal })) {
    checksum.update(chunk)
    size += chunk.length
  }
  if (size === 0) throw new Error('Cannot store an empty image')
  const md5hash = checksum.digest('hex')
  signal?.throwIfAborted()
  const assembly = await client.createAssembly({
    chunkSize,
    files: { image: filePath },
    onAssemblyProgress,
    onUploadProgress,
    params: {
      steps: {
        stored: {
          robot: '/transloadit/store',
          use: ':original',
          path,
          conflict_strategy: overwrite === true ? 'overwrite' : 'error',
        },
      },
    },
    signal,
    timeout,
    waitForCompletion: true,
  })
  const input = { path, size, md5hash }
  // API2 can watermark uploads before Robots run; this exact write's result describes stored bytes.
  const receipt = validateReceipt(assembly, input, true)
  const observerFailed = (): void => {
    debug('transloadit:warn')('Ignored onReceipt observer failure after a completed Storage write')
  }
  try {
    // Neither a stalled observer nor its rejection may hide a successfully stored receipt.
    void Promise.resolve(onReceipt?.({ ...receipt }, input, assembly.assembly_id)).catch(
      observerFailed,
    )
  } catch {
    observerFailed()
  }
  return receipt
}

/** Fetches authoritative Assembly status and applies the same validation as a local image store. */
export async function getStoredImageReceipt(
  client: Transloadit,
  options: GetStoredImageReceiptOptions,
): Promise<StoredImageReceipt> {
  const { assemblyId, expected } = receiptRequestSchema.parse(options)
  validateDestination(expected.path)
  const assembly = await client.getAssembly(assemblyId)
  if (assembly.assembly_id !== assemblyId) {
    throw new InconsistentResponseError('The response did not match the requested Assembly', {
      cause: { assemblyId },
    })
  }
  return validateReceipt(assembly, expected)
}

function validateReceipt(
  assembly: AssemblyStatus,
  expected: StoredImageExpectation,
  acceptTransformed = false,
): StoredImageReceipt {
  const { path, size, md5hash } = expected
  if (typeof assembly.error === 'string') throw new ApiError({ body: assembly })
  if (assembly.ok === 'ASSEMBLY_CANCELED') {
    throw new InconsistentResponseError('The Storage Assembly ended with ASSEMBLY_CANCELED', {
      cause: { assemblyId: assembly.assembly_id },
    })
  }
  if (
    assembly.ok === 'ASSEMBLY_UPLOADING' ||
    assembly.ok === 'ASSEMBLY_EXECUTING' ||
    assembly.ok === 'ASSEMBLY_REPLAYING'
  ) {
    throw new InconsistentResponseError(`The Storage Assembly is not complete (${assembly.ok})`, {
      cause: { assemblyId: assembly.assembly_id },
    })
  }
  const parsed = completedImageSchema.safeParse(assembly)
  const result = parsed.success ? parsed.data.results[':original'][0] : undefined
  const originals = assembly.results?.[':original']
  const receiptCheck = {
    originalCount: Array.isArray(originals) ? originals.length : 0,
    metadataValid: parsed.success,
    pathMatches: result === undefined ? undefined : result.path === path,
    sizeMatches: result === undefined ? undefined : result.size === size,
    md5Matches: result === undefined ? undefined : result.md5hash === md5hash,
  }
  if (
    result === undefined ||
    result.path !== path ||
    (!acceptTransformed && (!receiptCheck.sizeMatches || !receiptCheck.md5Matches))
  ) {
    throw new InconsistentResponseError(
      'The Assembly did not return a matching Storage image receipt',
      {
        cause: { assemblyId: assembly.assembly_id, receiptCheck },
      },
    )
  }
  return result
}
