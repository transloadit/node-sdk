import { createImages } from '@transloadit/viewer/next/server'

import { authorizeFixtureImage } from '../browser-policy'
import { imageConfiguration } from './imageConfiguration'

const { Image, imageRoute } = createImages({
  ...imageConfiguration,
  allowedPathPrefixes: ['documents/'],
  authorize: authorizeFixtureImage,
  basePath: '/fixture',
  route: '/api/private-images',
  lifetime: 5 * 60 * 1000,
  rotationIntervalMs: 30 * 1000,
})

export { Image as TransloaditRedirectImage, imageRoute }
