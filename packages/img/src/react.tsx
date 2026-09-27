import type { ReactNode } from 'react'

import type { TransloaditImageLayoutProps } from './picture.tsx'
import type { StorageImageReceipt, StorageRenditionPolicy } from './storage.ts'

import { TransloaditPicture } from './picture.tsx'
import { createBlurDataURL } from './placeholder.ts'
import {
  createStorageModel,
  snapshotStorageImage,
  snapshotStoragePolicy,
  storageRouteHref,
} from './storage.ts'

export type { TransloaditPictureProps } from './picture.tsx'
export type {
  StorageAssetReceipt,
  StorageCropProfile,
  StorageImageReceipt,
  StorageRenditionPolicy,
} from './storage.ts'

export { TransloaditPicture } from './picture.tsx'
export { defaultStorageRoute, getStorageAssetHref } from './storage.ts'

/** Receipt-backed native React image; only its same-origin route authorizes CDN delivery. */
export type ImageProps = TransloaditImageLayoutProps & {
  src: StorageImageReceipt
  route?: string
  policy?: StorageRenditionPolicy
  crop?: string
  /** Inline already-authorized preview pixels from receipt metadata. Empty by default. */
  placeholder?: 'empty' | 'blur'
  width?: never
  height?: never
}

/** Uses canonical receipt dimensions and stable route URLs, including on long-open client pages. */
export function Image(props: ImageProps): ReactNode {
  const src = snapshotStorageImage(props.src)
  const policy = snapshotStoragePolicy(props.policy)
  let geometry = { width: src.width, height: src.height }
  const model = createStorageModel(src, policy, props.crop, ({ urlParams }) => {
    // Reuse the core's rounded crop geometry for the display box too.
    if (props.crop !== undefined && urlParams.f === 'jpg')
      geometry = { width: Number(urlParams.w), height: Number(urlParams.h) }
    return storageRouteHref(src, 'preview', props.route, {
      w: String(urlParams.w),
      f: String(urlParams.f),
      crop: props.crop,
    })
  })
  return (
    <TransloaditPicture
      {...props}
      {...geometry}
      model={model}
      blurDataURL={props.placeholder === 'blur' ? createBlurDataURL(src) : undefined}
    />
  )
}
