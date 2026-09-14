import type { ReactNode } from 'react'

import { StorageImage } from '@transloadit/img/next'

export default function Page(): ReactNode {
  return (
    <StorageImage
      src="website/alpha.png"
      alt="Transparent public image"
      width={64}
      preload
      placeholder="blur"
    />
  )
}
