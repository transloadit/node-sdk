import type { ReactNode } from 'react'

import type { StorageImageProps } from './index.tsx'

import { statSync } from 'node:fs'

import options from '@transloadit/img/next/options'

import { getProjectImages } from './project.ts'

export type {
  RegisteredStorageImages,
  StorageImageProps,
  TransloaditImageLayoutProps,
  TransloaditImagePresentationProps,
  TransloaditPictureProps,
} from './index.tsx'

export { TransloaditPicture } from './index.tsx'

/** Render a project catalog image directly from Smart CDN, or through an authorized redirect. */
export function StorageImage(props: StorageImageProps): ReactNode {
  try {
    return getProjectImages().StorageImage(props)
  } catch (error) {
    // Config discovers aliases once. Diagnose a late file, but never load or trust it at runtime.
    if (
      process.env.NODE_ENV === 'development' &&
      error instanceof TypeError &&
      error.message === "Private images require authorize or delivery: 'direct'" &&
      options.authorizePath !== undefined &&
      statSync(options.authorizePath, { throwIfNoEntry: false })?.isFile()
    )
      throw new TypeError(
        'transloadit.authorize.ts exists but was added after next dev started. Restart next dev to bundle it.',
        { cause: error },
      )
    throw error
  }
}
