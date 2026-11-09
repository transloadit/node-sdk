import type { ReactNode } from 'react'

import { Image } from '@transloadit/viewer/next'

export default function Page(): ReactNode {
  return (
    <>
      <Image
        storage
        src="website/alpha.png"
        alt="Transparent public image"
        width={64}
        preload
        placeholder="blur"
      />
      <Image
        storage
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
