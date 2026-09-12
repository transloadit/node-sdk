import { createTransloaditImage } from '@transloadit/img/next/server'

import { authorizeFixtureImage } from '../../browser-policy'
import { imageConfiguration } from '../imageConfiguration'

/** Short grants make actual expiration testable without changing the package's clock/defaults. */
export const { StorageImage: BrowserImage, storageRoute: browserStorageRoute } =
  createTransloaditImage({
    ...imageConfiguration,
    storage: {
      allowedPathPrefixes: ['documents/'],
      delivery: {
        authorize: authorizeFixtureImage,
        route: '/api/browser-images',
      },
      expiresInMs: 10_000,
      rotationIntervalMs: 1_000,
    },
  })
