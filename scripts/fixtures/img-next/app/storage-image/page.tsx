import type { ReactNode } from 'react'

import { TransloaditImage } from '../TransloaditImage'

export default function Page(): ReactNode {
  return (
    <main>
      <TransloaditImage
        alt="Storage hero"
        className="hero"
        id="hero"
        sizes="(min-width: 960px) 960px, 100vw"
        src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
      />
      <p>After the hero</p>
      <TransloaditImage
        alt="Storage avatar"
        id="avatar"
        objectFit="cover"
        sizes="48px"
        src={{ path: 'documents/avatar.jpg', width: 400, height: 400 }}
        style={{ display: 'block', height: 48, width: 48 }}
        widths={[48, 96]}
      />
      <p>After the avatar</p>
    </main>
  )
}
