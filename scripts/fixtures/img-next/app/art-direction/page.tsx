import type { ReactNode } from 'react'

import { BrowserImage } from '../browser/BrowserImage'

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Art-directed hero</h1>
      <style>
        {
          '.art-hero { position: relative; width: 100%; max-width: 960px; aspect-ratio: 16 / 9; } @media (max-width: 639px) { .art-hero { aspect-ratio: 9 / 16; } }'
        }
      </style>
      <div className="art-hero">
        <BrowserImage
          alt="Viewport crop"
          src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
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
