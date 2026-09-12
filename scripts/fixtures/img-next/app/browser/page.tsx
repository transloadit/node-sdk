import type { ReactNode } from 'react'

import { BrowserImage } from './BrowserImage.tsx'

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Private image lifecycle</h1>
      <BrowserImage
        alt="Private hero"
        className="hero"
        preload
        sizes="(min-width: 960px) 960px, 100vw"
        src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
      />
      <p>After the hero</p>
      <BrowserImage
        alt="Private avatar"
        objectFit="cover"
        sizes="48px"
        src={{ path: 'documents/avatar.jpg', width: 400, height: 400 }}
        style={{ display: 'block', height: 48, width: 48 }}
        widths={[48, 96]}
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
