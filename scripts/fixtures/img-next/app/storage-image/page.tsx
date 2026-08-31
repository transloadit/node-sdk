import type { ReactNode } from 'react'

import { TransloaditImage } from '../TransloaditImage.tsx'

export default function Page(): ReactNode {
  return (
    <TransloaditImage
      alt="Storage fixture"
      height={300}
      sizes="400px"
      source={{ path: 'documents/report.pdf', type: 'storage' }}
      suspenseFallback={<div aria-label="Loading preview" role="status" />}
      width={400}
      widths={[200, 400]}
    />
  )
}
