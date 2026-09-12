import type { ReactNode } from 'react'

import { DeliveryImage } from './StorageImages'

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Static and private delivery</h1>
      <DeliveryImage
        alt="Public website image"
        src={{ path: 'documents/public/hero.jpg', width: 400, height: 300 }}
        preload
      />
      <DeliveryImage
        alt="Private account image"
        src={{ path: 'documents/private/hero.jpg', width: 400, height: 300 }}
      />
    </main>
  )
}
