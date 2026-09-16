import { Image, TemplateImage } from './Image'

export default function Page() {
  return (
    <main>
      <h1>Source model experiment</h1>
      <p>
        One renderer, three configured sources. Local delivery fixtures, not a production CDN
        benchmark.
      </p>
      <h2>Transloadit Storage</h2>
      <Image storage src="website/hero.jpg" alt="Storage experiment" width={320} preload />
      <h2>Existing HTTP origin</h2>
      <Image source="website" src="website/hero.jpg" alt="HTTP experiment" width={320} preload />
      <h2>Existing S3 bucket</h2>
      <Image source="products" src="products/hero.jpg" alt="S3 experiment" width={320} preload />
      <h2>Template selector comparison</h2>
      <TemplateImage
        template="fixture-http"
        src="website/hero.jpg"
        alt="Template experiment"
        width={320}
        preload
      />
    </main>
  )
}
