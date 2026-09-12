import type { ReactNode } from 'react'

import { TransloaditRedirectImage } from '../TransloaditRedirectImage.tsx'

export default function Page(): ReactNode {
  return (
    <TransloaditRedirectImage
      alt="Authorized Storage fixture"
      fetchPriority="high"
      height={1600}
      preload
      sizes="(min-width: 960px) 960px, 100vw"
      src="documents/hero.jpg"
      style={{ display: 'block', height: 'auto', maxWidth: 960, width: '100%' }}
      width={2400}
    />
  )
}
