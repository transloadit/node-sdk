import type { ReactNode } from 'react'

import type { StorageImageProps } from './index.tsx'

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
  return getProjectImages().StorageImage(props)
}
