import { StorageImage } from '@transloadit/img/next'

export default function Page() {
  return (
    <main>
      <h1>Images from the package</h1>
      <StorageImage src="website/hero.jpg" alt="Package hero" width={960} preload />
      <StorageImage
        src="documents/private/hero.jpg"
        alt="Package private image"
        width={96}
        errorFallback={<p role="status">Sign in to see this image</p>}
      />
    </main>
  )
}
