import type { ReactNode } from 'react'

import { TransloaditImage } from '../TransloaditImage.tsx'

export default function Page(): ReactNode {
  return (
    <TransloaditImage
      alt="Public fixture"
      fallbackSrc="/fallback.jpg"
      fetchPriority="high"
      height={1200}
      preload
      sizes="800px"
      src="https://assets.example/photo.jpg"
      width={1600}
    />
  )
}
