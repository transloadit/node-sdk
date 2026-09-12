import type { ReactNode } from 'react'

import { BrowserImage } from '../browser/BrowserImage'

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Private image failure</h1>
      <BrowserImage
        alt="Private preview"
        src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
        layout="constrained"
        maxWidth={960}
        errorFallback={<p role="status">Sign in to see this image</p>}
      />
    </main>
  )
}
