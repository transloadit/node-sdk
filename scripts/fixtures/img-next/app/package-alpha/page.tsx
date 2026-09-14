import type { ReactNode } from 'react'

import { StorageImage } from '@transloadit/img/next'

export default function Page(): ReactNode {
  return (
    <>
      <StorageImage
        src="website/alpha.png"
        alt="Transparent public image"
        width={64}
        preload
        placeholder="blur"
      />
      <StorageImage
        src="website/hero.jpg"
        alt="Letterboxed public image"
        layout="fixed"
        width={300}
        height={300}
        preload
        placeholder="blur"
      />
    </>
  )
}
