import { createTransloaditImage } from '@transloadit/img/next/server'

import { imageConfiguration } from './imageConfiguration.ts'

const { Image } = createTransloaditImage({
  ...imageConfiguration,
  storage: { allowedPathPrefixes: ['documents/'] },
})

export { Image as TransloaditImage }
