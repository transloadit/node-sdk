import type { ReactNode } from 'react'

import { BrowserImage } from './BrowserImage.tsx'

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Private image lifecycle</h1>
      <BrowserImage
        alt="Private hero"
        className="hero"
        height={1600}
        preload
        sizes="(min-width: 960px) 960px, 100vw"
        src="documents/hero.jpg"
        width={2400}
      />
      <p>After the hero</p>
      <BrowserImage
        alt="Private avatar"
        height={400}
        objectFit="cover"
        sizes="48px"
        src="documents/avatar.jpg"
        style={{ display: 'block', height: 48, width: 48 }}
        width={400}
        widths={[48, 96]}
      />
      <p>After the avatar</p>
      <section style={{ marginTop: 10_000 }}>
        <BrowserImage
          alt="Late private preview"
          formats={{ avif: 45 }}
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
