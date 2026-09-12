import type { CreateAssemblyOptions, Transloadit } from './Transloadit.ts'

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'

import { z } from 'zod'

import InconsistentResponseError from './InconsistentResponseError.ts'

/**
 * Verified Storage metadata that can be saved and passed directly to an image renderer.
 * Width and height reflect EXIF auto-orientation, matching Storage preview delivery.
 */
export interface StoredImageReceipt {
  readonly asset_id: string
  readonly height: number
  readonly md5hash: string
  readonly path: string
  readonly size: number
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
}

const positiveIntegerSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
// API2 exposes EXIFTool's orientation labels; numeric EXIF tags use the same axis swap.
const dimensionSwappingOrientations = new Set<string | number>([
  5,
  6,
  7,
  8,
  'Mirror horizontal and rotate 270 CW',
  'Rotate 90 CW',
  'Mirror horizontal and rotate 90 CW',
  'Rotate 270 CW',
])
const completedImageSchema = z.object({
  ok: z.literal('ASSEMBLY_COMPLETED'),
  results: z.object({
    ':original': z.tuple([
      z.object({
        asset_id: z
          .string()
          .min(1)
          .refine((value) => value.trim() === value),
        md5hash: z.string(),
        meta: z.object({
          height: positiveIntegerSchema,
          orientation: z.union([z.string(), z.number()]).nullable().optional(),
          width: positiveIntegerSchema,
        }),
        path: z.string(),
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
  const { path, chunkSize, onAssemblyProgress, onUploadProgress, signal, timeout } = options
  validateDestination(path)
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
        stored: { robot: '/transloadit/store', use: ':original', path, conflict_strategy: 'error' },
      },
    },
    signal,
    timeout,
    waitForCompletion: true,
  })
  const parsed = completedImageSchema.safeParse(assembly)
  const result = parsed.success ? parsed.data.results[':original'][0] : undefined
  if (
    result === undefined ||
    result.path !== path ||
    result.size !== size ||
    result.md5hash !== md5hash
  ) {
    throw new InconsistentResponseError(
      'The Assembly did not return a matching Storage image receipt',
      {
        cause: { assemblyId: assembly.assembly_id },
      },
    )
  }
  const { height, orientation, width } = result.meta
  const swapDimensions = orientation != null && dimensionSwappingOrientations.has(orientation)
  return {
    asset_id: result.asset_id,
    height: swapDimensions ? width : height,
    md5hash,
    path,
    size,
    width: swapDimensions ? height : width,
  }
}
