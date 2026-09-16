import { createImages } from '@transloadit/viewer/next/server'

import { imageConfiguration } from './imageConfiguration'

const { Image } = createImages({
  baseUrl: imageConfiguration.baseUrl,
  allowedPathPrefixes: ['documents/'],
  delivery: 'direct',
})

export { Image as TransloaditImage }
