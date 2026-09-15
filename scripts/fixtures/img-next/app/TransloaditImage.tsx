import { createStorageImages } from '@transloadit/img/next/server'

import { imageConfiguration } from './imageConfiguration'

const { StorageImage } = createStorageImages({
  baseUrl: imageConfiguration.baseUrl,
  allowedPathPrefixes: ['documents/'],
  delivery: 'direct',
})

export { StorageImage as TransloaditImage }
