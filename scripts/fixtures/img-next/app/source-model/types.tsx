import { Image } from '@transloadit/viewer/next'

// The packed consumer compiles the real package API and its generated Storage catalog types.
const storage = <Image storage src="website/hero.jpg" alt="Storage" width={320} />
const http = (
  <Image
    workspace="fixture"
    template="fixture-http"
    src="website/hero.jpg"
    alt="HTTP"
    width={320}
    height={240}
  />
)
const s3 = (
  <Image
    template="fixture-s3"
    src={{ path: 'products/hero.jpg', width: 1200, height: 800 }}
    alt="S3"
    width={320}
  />
)

// @ts-expect-error The Storage catalog still rejects misspelled paths.
const wrongCatalog = <Image storage src="website/missing.jpg" alt="Missing" />
// @ts-expect-error Storage and a custom template are mutually exclusive.
const ambiguous = <Image storage template="fixture-http" src="website/hero.jpg" alt="Ambiguous" />
// @ts-expect-error The package-first API needs a source choice; factories can bind a default.
const missingSource = <Image src="website/hero.jpg" alt="Missing source" />
// @ts-expect-error External paths cannot borrow geometry from the Storage catalog.
const missingDimensions = <Image template="fixture-http" src="website/hero.jpg" alt="Incomplete" />
// @ts-expect-error No source registry or aliases are part of the public API.
const sourceAlias = <Image source="products" src="products/hero.jpg" alt="Alias" />

void [storage, http, s3, wrongCatalog, ambiguous, missingSource, missingDimensions, sourceAlias]
