import type { ReactNode } from 'react'

import { createStorageImages } from '@transloadit/img/next/server'

import { imageConfiguration } from '../imageConfiguration'

const images = {
  'documents/hero.jpg': { path: 'documents/hero.jpg', width: 2400, height: 1600 },
}

const { StorageImage } = createStorageImages({
  images,
  public: ['documents/'],
  baseUrl: imageConfiguration.baseUrl,
})

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Static public image</h1>
      <StorageImage
        src="documents/hero.jpg"
        alt="Public hero"
        layout="constrained"
        maxWidth={960}
        preload
      />
    </main>
  )
}
