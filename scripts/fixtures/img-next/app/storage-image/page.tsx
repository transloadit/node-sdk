import type { ReactNode } from 'react'

import { fixtureStorageIdentity } from '../../storage-fixtures'
import { TransloaditImage } from '../TransloaditImage'

export default function Page(): ReactNode {
  return (
    <main>
      <TransloaditImage
        alt="Storage hero"
        id="hero"
        layout="constrained"
        width={960}
        src={{
          ...fixtureStorageIdentity('documents/hero.jpg'),
          path: 'documents/hero.jpg',
          width: 2400,
          height: 1600,
        }}
      />
      <p>After the hero</p>
      <TransloaditImage
        alt="Storage avatar"
        id="avatar"
        layout="fixed"
        width={48}
        height={48}
        fit="cover"
        src={{
          ...fixtureStorageIdentity('documents/avatar.jpg'),
          path: 'documents/avatar.jpg',
          width: 400,
          height: 300,
        }}
      />
      <p>After the avatar</p>
    </main>
  )
}
