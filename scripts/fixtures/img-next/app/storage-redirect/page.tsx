import type { ReactNode } from 'react'

import { TransloaditRedirectImage } from '../TransloaditRedirectImage.tsx'

export default function Page(): ReactNode {
  return (
    <TransloaditRedirectImage
      alt="Authorized Storage fixture"
      height={300}
      sizes="400px"
      src={{ storage: 'documents/report.pdf' }}
      width={400}
    />
  )
}
