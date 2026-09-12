import { createTransloaditImage } from '@transloadit/img/next/server'

import { authorizeFixtureImage } from '../browser-policy'
import { imageConfiguration } from './imageConfiguration'

const { StorageImage, storageRoute } = createTransloaditImage({
  ...imageConfiguration,
  allowedPathPrefixes: ['documents/'],
  authorize: authorizeFixtureImage,
  basePath: '/fixture',
  route: '/api/private-images',
  lifetime: 5 * 60 * 1000,
  rotationIntervalMs: 30 * 1000,
})

export { StorageImage as TransloaditRedirectImage, storageRoute }
