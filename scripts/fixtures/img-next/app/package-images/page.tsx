import { Image } from '@transloadit/viewer/next'

export default function Page() {
  return (
    <main>
      <h1>Images from the package</h1>
      <Image storage src="website/hero.jpg" alt="Package hero" width={960} preload />
      <Image
        storage
        src="documents/private/hero.jpg"
        alt="Package private image"
        width={96}
        errorFallback={<p role="status">Sign in to see this image</p>}
      />
    </main>
  )
}
