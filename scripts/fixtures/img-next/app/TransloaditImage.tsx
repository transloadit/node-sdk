import { createStorageImages } from '@transloadit/img/next/server'

import { imageConfiguration } from './imageConfiguration'

const { StorageImage } = createStorageImages({
  baseUrl: imageConfiguration.baseUrl,
  allowedPathPrefixes: ['documents/'],
})

export { StorageImage as TransloaditImage }
