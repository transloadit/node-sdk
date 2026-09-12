import type { ReactNode } from 'react'

import { TransloaditImage } from '../TransloaditImage'

export default function Page(): ReactNode {
  return (
    <main>
      <TransloaditImage
        alt="Storage hero"
        id="hero"
        layout="constrained"
        maxWidth={960}
        src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
      />
      <p>After the hero</p>
      <TransloaditImage
        alt="Storage avatar"
        id="avatar"
        layout="fixed"
        width={48}
        height={48}
        fit="cover"
        src={{ path: 'documents/avatar.jpg', width: 400, height: 300 }}
      />
      <p>After the avatar</p>
    </main>
  )
}
