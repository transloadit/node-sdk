import type { ReactNode } from 'react'

import { BrowserImage } from '../browser/BrowserImage'

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Layout modes</h1>
      <div style={{ position: 'relative', width: 390, aspectRatio: '9/16' }}>
        <BrowserImage
          alt="Portrait cover"
          src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
          layout="fill"
          fit="cover"
          aspectRatio="9/16"
          sizes="390px"
          widths={[390, 780]}
        />
      </div>
    </main>
  )
}
