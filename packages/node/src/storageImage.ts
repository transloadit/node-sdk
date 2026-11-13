import type {
  GetStoredAssetReceiptOptions,
  StoreAssetOptions,
  StoredAssetExpectation,
  StoredAssetReceipt,
} from './storageAsset.ts'
import type { Transloadit } from './Transloadit.ts'

import { z } from 'zod'

import { storedAssetSchema } from './alphalib/types/storageAsset.ts'
import InconsistentResponseError from './InconsistentResponseError.ts'
import { getOriginalReceipt, storeOriginal } from './storageAsset.ts'

export { storageImagePlaceholderSchema } from './storageAsset.ts'

/** Verified image metadata; dimensions reflect EXIF orientation used by preview delivery. */
export interface StoredImageReceipt extends StoredAssetReceipt {
  readonly height: number
  readonly width: number
}

export type StoredImageExpectation = StoredAssetExpectation
export type GetStoredImageReceiptOptions = GetStoredAssetReceiptOptions

/** Image-specific callback on the shared original upload pipeline. */
export interface StoreImageOptions extends Omit<StoreAssetOptions, 'onReceipt'> {
  onReceipt?: (
    receipt: StoredImageReceipt,
    input: StoredImageExpectation,
    assemblyId: string | undefined,
  ) => void | Promise<void>
}

const imageReceiptSchema = storedAssetSchema.extend({
  md5hash: storedAssetSchema.shape.md5hash.unwrap(),
  height: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  width: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
})

function requireImage(receipt: StoredAssetReceipt): StoredImageReceipt {
  const image = imageReceiptSchema.safeParse(receipt)
  if (!image.success) {
    throw new InconsistentResponseError(
      'The Assembly did not return a matching Storage image receipt',
      {
        cause: { receipt },
      },
    )
  }
  return image.data
}

/** Retains the image API's transformed-byte semantics; use storeAsset for exact originals. */
export async function storeImage(
  client: Transloadit,
  filePath: string,
  options: StoreImageOptions,
): Promise<StoredImageReceipt> {
  const receipt = await storeOriginal(
    client,
    filePath,
    {
      ...options,
      onReceipt: (asset, input, assemblyId) =>
        options.onReceipt?.(requireImage(asset), input, assemblyId),
    },
    true,
  )
  return requireImage(receipt)
}

/** Recovers one image receipt with the same strict byte checks as generic receipt recovery. */
export async function getStoredImageReceipt(
  client: Transloadit,
  options: GetStoredImageReceiptOptions,
): Promise<StoredImageReceipt> {
  return requireImage(await getOriginalReceipt(client, options, true))
}
