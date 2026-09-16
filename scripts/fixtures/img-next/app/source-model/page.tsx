import { Image } from '@transloadit/viewer/next'

export default function Page() {
  return (
    <main>
      <h1>Image sources</h1>
      <p>
        One renderer, Storage and explicit templates. Local delivery fixtures, not a production CDN
        benchmark.
      </p>
      <h2>Transloadit Storage</h2>
      <Image storage src="website/hero.jpg" alt="Storage experiment" width={320} preload />
      <h2>Existing HTTP origin</h2>
      <Image
        workspace="fixture"
        template="fixture-http"
        src={{ path: 'website/hero.jpg', width: 2400, height: 1600 }}
        alt="HTTP experiment"
        width={320}
        preload
      />
      <h2>Existing S3 bucket</h2>
      <Image
        workspace="fixture"
        template="fixture-s3"
        src={{ path: 'products/hero.jpg', width: 2400, height: 1600 }}
        alt="S3 experiment"
        width={320}
        preload
      />
      <h2>Default workspace</h2>
      <Image
        template="fixture-http"
        src={{ path: 'website/hero.jpg', width: 2400, height: 1600 }}
        alt="Template experiment"
        width={320}
        preload
      />
    </main>
  )
}
