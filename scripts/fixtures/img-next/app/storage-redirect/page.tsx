import type { ReactNode } from 'react'

import { TransloaditRedirectImage } from '../TransloaditRedirectImage.tsx'

export default function Page(): ReactNode {
  return (
    <TransloaditRedirectImage
      alt="Authorized Storage fixture"
      fetchPriority="high"
      height={300}
      preload
      sizes="400px"
      src="documents/report.pdf"
      width={400}
    />
  )
}
