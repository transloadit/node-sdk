import { createTransloaditImage } from '@transloadit/img/next/server'

import { authorizeFixtureImage } from '../../browser-policy.ts'
import { imageConfiguration } from '../imageConfiguration.ts'

/** Short grants make actual expiration testable without changing the package's clock/defaults. */
export const { Image: BrowserImage, storageRoute: browserStorageRoute } = createTransloaditImage({
  ...imageConfiguration,
  storage: {
    allowedPathPrefixes: ['documents/'],
    delivery: {
      authorize: authorizeFixtureImage,
      basePath: '/fixture',
      route: '/api/browser-images',
    },
    expiresInMs: 10_000,
    rotationIntervalMs: 1_000,
  },
})
