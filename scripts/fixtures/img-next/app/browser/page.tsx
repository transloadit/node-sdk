import type { ReactNode } from 'react'

import { fixtureStorageIdentity } from '../../storage-fixtures'
import { BrowserImage } from './BrowserImage'

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Private image lifecycle</h1>
      <BrowserImage
        alt="Private hero"
        preload
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
      <BrowserImage
        alt="Private avatar"
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
      <section style={{ marginTop: 10_000 }}>
        <BrowserImage
          alt="Late private preview"
          formats={{ webp: 45 }}
          height={300}
          sizes="400px"
          src="documents/late.jpg"
          style={{ display: 'block', width: 400, height: 300 }}
          width={400}
          widths={[400]}
        />
      </section>
    </main>
  )
}
