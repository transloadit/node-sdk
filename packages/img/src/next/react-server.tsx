import type { ReactNode } from 'react'

import type { ImageProps, StorageImageProps } from './index.tsx'

import { statSync } from 'node:fs'

import { authorize } from '@transloadit/viewer/next/authorize'
import options from '@transloadit/viewer/next/options'

import { getProjectImages, getProjectTemplateImages } from './project.ts'

export type {
  ImageProps,
  RegisteredStorageImages,
  StorageImageProps,
  TransloaditImageLayoutProps,
  TransloaditImagePresentationProps,
  TransloaditPictureProps,
} from './index.tsx'

export { TransloaditPicture } from './index.tsx'

/** Render Storage or a compatible custom Template without exposing keys or selecting an alias. */
export function Image(props: ImageProps): ReactNode {
  if (props.storage === true) {
    if (props.template !== undefined) throw new TypeError('Choose storage or template, not both')
    const { storage, template, workspace, ...image } = props
    return renderStorageImage(image, workspace)
  }
  if (props.storage !== undefined || typeof props.template !== 'string')
    throw new TypeError('Choose storage or an explicit image template')
  const { storage, template, workspace, ...image } = props
  assertBundledAuthorizer()
  return getProjectTemplateImages(template, workspace).Image(image)
}

function assertBundledAuthorizer(cause?: unknown): void {
  // Never load an authorizer at runtime; config must bundle it and its dependencies together.
  if (
    process.env.NODE_ENV === 'development' &&
    authorize === undefined &&
    options.authorizePath !== undefined &&
    statSync(options.authorizePath, { throwIfNoEntry: false })?.isFile()
  )
    throw new TypeError(
      'transloadit.authorize.ts exists but was added after next dev started. Restart next dev to bundle it.',
      { cause },
    )
}

function renderStorageImage(props: StorageImageProps, workspace?: string): ReactNode {
  try {
    return getProjectImages(workspace).Image(props)
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === "Private images require authorize or delivery: 'direct'"
    )
      assertBundledAuthorizer(error)
    throw error
  }
}
