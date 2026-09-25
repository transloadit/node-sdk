import { headers } from 'next/headers'
import { Suspense } from 'react'

import { authorizeFixtureImage } from '../../browser-policy.ts'
import { fixtureImage } from '../../storage-fixtures.ts'
import { DynamicImage } from './DynamicImage.tsx'

async function AuthorizedImages() {
  // Hashes are image content: the toy app gates its query result, not only the image redirect.
  const request = new Request('http://fixture.local', { headers: await headers() })
  if (!authorizeFixtureImage({ request })) return <p>Sign in to view this album</p>
  const receipt = {
    ...fixtureImage('documents/avatar.jpg', 400, 300),
    size: 1000,
    mime: 'image/jpeg',
    // Fixed metadata from a solid 32×24 RGB input matching the protocol fake's image color.
    thumbhash: 'WnUBBYAIa7uGh4eIiGeIiIeAeH+X',
    has_alpha: false,
  }
  const alpha = {
    ...fixtureImage('documents/alpha.png', 64, 64),
    has_alpha: true,
    thumbhash: 'WnWBBIAITyhniHNYB4SXiIf/sJSIaHiVBw==',
  }
  return <DynamicImage receipt={receipt} alpha={alpha} />
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading album…</p>}>
      <AuthorizedImages />
    </Suspense>
  )
}
