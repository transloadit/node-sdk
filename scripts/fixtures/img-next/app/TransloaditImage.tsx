import { createTransloaditImageFromEnv } from '@transloadit/img/next/server'

import { imageConfiguration } from './imageConfiguration'

const { StorageImage } = createTransloaditImageFromEnv({
  baseUrl: imageConfiguration.baseUrl,
  storage: { allowedPathPrefixes: ['documents/'] },
})

export { StorageImage as TransloaditImage }
