import type { ReactNode } from 'react'

import { TransloaditImage } from '../TransloaditImage.tsx'

export default function Page(): ReactNode {
  return (
    <TransloaditImage
      alt="Public fixture"
      expiresAt={Date.UTC(2035, 0, 1)}
      fallbackSrc="/fallback.jpg"
      fetchPriority="high"
      height={600}
      preload
      sizes="800px"
      source={{
        height: 1200,
        type: 'url',
        url: 'https://assets.example/photo.jpg',
        width: 1600,
      }}
      width={800}
      widths={[400, 800, 1600]}
    />
  )
}
