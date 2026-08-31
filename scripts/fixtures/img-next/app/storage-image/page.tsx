import type { ReactNode } from 'react'

import { TransloaditImage } from '../TransloaditImage.tsx'

export default function Page(): ReactNode {
  return (
    <TransloaditImage
      alt="Storage fixture"
      height={300}
      sizes="400px"
      src="documents/report.pdf"
      suspenseFallback={<div aria-label="Loading preview" role="status" />}
      width={400}
    />
  )
}
