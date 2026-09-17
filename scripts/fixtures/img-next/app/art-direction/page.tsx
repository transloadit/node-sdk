import type { ReactNode } from 'react'

import { fixtureStorageIdentity } from '../../storage-fixtures'
import { BrowserImage } from '../browser/BrowserImage'

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Art-directed hero</h1>
      <div style={{ maxWidth: 960 }}>
        <BrowserImage
          alt="Viewport crop"
          src={{
            ...fixtureStorageIdentity('documents/hero.jpg'),
            path: 'documents/hero.jpg',
            width: 2400,
            height: 1600,
          }}
          layout="fill"
          fit="cover"
          aspectRatio={{ '(max-width: 639px)': '9/16', default: '16/9' }}
          sizes="(min-width: 960px) 960px, 100vw"
          widths={[320, 640, 960]}
          preload
        />
      </div>
    </main>
  )
}
