import { createTransloaditImage } from '@transloadit/img/next/server'

import { authorizeFixtureImage } from '../browser-policy'
import { imageConfiguration } from './imageConfiguration'

const { StorageImage, storageRoute } = createTransloaditImage({
  ...imageConfiguration,
  storage: {
    allowedPathPrefixes: ['documents/'],
    delivery: {
      authorize: authorizeFixtureImage,
      basePath: '/fixture',
      route: '/api/private-images',
    },
    expiresInMs: 5 * 60 * 1000,
    rotationIntervalMs: 30 * 1000,
  },
})

export { StorageImage as TransloaditRedirectImage, storageRoute }
