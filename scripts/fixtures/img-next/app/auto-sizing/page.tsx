import type { ReactNode } from 'react'

import { fixtureStorageIdentity } from '../../storage-fixtures'
import { TransloaditImage } from '../TransloaditImage'

const source = {
  ...fixtureStorageIdentity('documents/hero.jpg'),
  path: 'documents/hero.jpg',
  width: 2400,
  height: 1600,
}

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Native automatic sizing</h1>
      <section style={{ width: 240 }}>
        <TransloaditImage
          alt="Automatic lazy sizing"
          formats={{ webp: 75 }}
          layout="constrained"
          width={960}
          src={source}
        />
        <TransloaditImage
          alt="Viewport fallback sizing"
          formats={{ webp: 75 }}
          layout="constrained"
          sizes="960px"
          width={960}
          src={source}
        />
      </section>
    </main>
  )
}
