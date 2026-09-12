import type { ReactNode } from 'react'

import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { BrowserImage } from '../browser/BrowserImage'
import { SignIn } from './SignIn'

async function PrivatePreview(): Promise<ReactNode> {
  const signedIn = (await cookies()).get('fixture-session')?.value === 'fixture'
  return (
    <BrowserImage
      alt="Private preview"
      src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
      layout="constrained"
      maxWidth={960}
      retryKey={signedIn ? 'signed-in' : 'anonymous'}
      errorFallback={<p role="status">Sign in to see this image</p>}
    />
  )
}

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Private image failure</h1>
      <Suspense fallback={<p>Reading session…</p>}>
        <PrivatePreview />
      </Suspense>
      <SignIn />
    </main>
  )
}
