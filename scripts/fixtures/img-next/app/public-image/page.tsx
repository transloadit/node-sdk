import type { ReactNode } from 'react'

import { createImages } from '@transloadit/viewer/next/server'

import { imageConfiguration } from '../imageConfiguration'

const { Image } = createImages({
  workspace: 'fixture',
  images: imageConfiguration.images,
  public: ['website/'],
  baseUrl: imageConfiguration.baseUrl,
})

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Static public image</h1>
      <Image src="website/hero.jpg" alt="Public hero" width={960} preload />
      <Image src="website/small.jpg" alt="Small public original" width={960} preload />
    </main>
  )
}
