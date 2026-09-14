import type { ReactNode } from 'react'

import { createStorageImages } from '@transloadit/img/next/server'

import { imageConfiguration } from '../imageConfiguration'

const images = {
  'website/hero.jpg': {
    path: 'website/hero.jpg',
    width: 2400,
    height: 1600,
    md5hash: 'd41d8cd98f00b204e9800998ecf8427e',
  },
  'website/small.jpg': { path: 'website/small.jpg', width: 320, height: 240 },
}

const { StorageImage } = createStorageImages({
  workspace: 'fixture',
  images,
  public: ['website/'],
  baseUrl: imageConfiguration.baseUrl,
})

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Static public image</h1>
      <StorageImage src="website/hero.jpg" alt="Public hero" width={960} preload />
      <StorageImage src="website/small.jpg" alt="Small public original" width={960} preload />
    </main>
  )
}
