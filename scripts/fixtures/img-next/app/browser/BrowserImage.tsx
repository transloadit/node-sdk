import { createStorageImages } from '@transloadit/img/next/server'

import { authorizeFixtureImage } from '../../browser-policy'
import { imageConfiguration } from '../imageConfiguration'

/** Short grants make actual expiration testable without changing the package's clock/defaults. */
export const { StorageImage: BrowserImage, storageRoute: browserStorageRoute } =
  createStorageImages({
    ...imageConfiguration,
    allowedPathPrefixes: ['documents/'],
    authorize: authorizeFixtureImage,
    basePath: '/fixture',
    route: '/api/browser-images',
    lifetime: 10_000,
    rotationInterval: '1s',
  })
