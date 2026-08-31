import type { ReactNode } from 'react'

import { notFound } from 'next/navigation.js'

import { TransloaditImage } from '../../../TransloaditImage.tsx'
import { TransloaditRedirectImage } from '../../../TransloaditRedirectImage.tsx'

interface PageProps {
  params: Promise<{ count: string; delivery: string }>
}

const benchmarkCounts = new Set([1, 20, 100])

export const instant = false

export default async function Page({ params }: PageProps): Promise<ReactNode> {
  const { count: countValue, delivery } = await params
  const count = Number(countValue)
  if (!benchmarkCounts.has(count) || (delivery !== 'direct' && delivery !== 'redirect')) {
    notFound()
  }
  const Image = delivery === 'direct' ? TransloaditImage : TransloaditRedirectImage
  const images: ReactNode[] = []
  for (let index = 0; index < count; index += 1) {
    images.push(
      <Image
        alt={`Benchmark preview ${index + 1}`}
        height={300}
        key={index}
        sizes="200px"
        src={{ storage: `documents/benchmark-${index + 1}.jpg` }}
        width={400}
      />,
    )
  }
  return <main>{images}</main>
}
