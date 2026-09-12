import type { ReactNode } from 'react'

import { BrowserImage } from '../browser/BrowserImage'

const source = { path: 'documents/alpha.png', width: 64, height: 64 }

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Transparent previews</h1>
      <BrowserImage alt="AVIF logo" src={source} formats={{ avif: 45 }} widths={[64]} />
      <BrowserImage alt="WebP logo" src={source} formats={{ webp: 75 }} widths={[64]} />
      <BrowserImage
        alt="PNG logo"
        src={source}
        formats={{ png: 75 }}
        widths={[64]}
        fallbackBackground="#224466"
      />
    </main>
  )
}
