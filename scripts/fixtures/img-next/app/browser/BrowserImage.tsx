import { createStorageImages } from '@transloadit/img/next/server'

import { authorizeFixtureImage } from '../../browser-policy'
import { imageConfiguration } from '../imageConfiguration'

/** Short grants make actual expiration testable without changing the package's clock/defaults. */
export const { StorageImage: BrowserImage, storageRoute: browserStorageRoute } =
  createStorageImages({
    ...imageConfiguration,
    allowedPathPrefixes: ['documents/'],
    authorize: authorizeFixtureImage,
    route: '/api/browser-images',
    lifetime: 10_000,
    rotationIntervalMs: 1_000,
  })
