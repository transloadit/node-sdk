import { createTransloaditImage } from '@transloadit/img/next/server'

import { imageConfiguration } from './imageConfiguration.ts'

const { Image, storageRoute } = createTransloaditImage({
  ...imageConfiguration,
  storage: {
    allowedPathPrefixes: ['documents/'],
    delivery: {
      authorize: ({ request }) => request.headers.get('authorization') === 'Bearer fixture',
      basePath: '/fixture',
      route: '/api/private-images',
    },
    expiresInMs: 5 * 60 * 1000,
    rotationIntervalMs: 30 * 1000,
  },
})

export { Image as TransloaditRedirectImage, storageRoute }
