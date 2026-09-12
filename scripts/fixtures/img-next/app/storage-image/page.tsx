import type { ReactNode } from 'react'

import { TransloaditImage } from '../TransloaditImage.tsx'

export default function Page(): ReactNode {
  return (
    <main>
      <TransloaditImage
        alt="Storage hero"
        height={1600}
        id="hero"
        sizes="(min-width: 960px) 960px, 100vw"
        src="documents/hero.jpg"
        style={{ display: 'block', height: 'auto', maxWidth: 960, width: '100%' }}
        width={2400}
      />
      <p>After the hero</p>
      <TransloaditImage
        alt="Storage avatar"
        height={400}
        id="avatar"
        objectFit="cover"
        sizes="48px"
        src="documents/avatar.jpg"
        style={{ display: 'block', height: 48, width: 48 }}
        width={400}
        widths={[48, 96]}
      />
      <p>After the avatar</p>
    </main>
  )
}
