import { createTransloaditImageFromEnv } from '@transloadit/img/next/server'

import { imageConfiguration } from './imageConfiguration.ts'

const { Image } = createTransloaditImageFromEnv({
  baseUrl: imageConfiguration.baseUrl,
  storage: { allowedPathPrefixes: ['documents/'] },
})

export { Image as TransloaditImage }
