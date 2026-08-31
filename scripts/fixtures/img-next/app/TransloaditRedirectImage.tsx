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
  },
})

export { Image as TransloaditRedirectImage, storageRoute }
