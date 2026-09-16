import { Image, TemplateImage } from './Image'

// This file compares proposed APIs against a real packed consumer, not public package exports.
const storage = <Image storage src="website/hero.jpg" alt="Storage" width={320} />
const http = <Image source="website" src="website/hero.jpg" alt="HTTP" width={320} />
const s3 = <Image source="products" src="products/hero.jpg" alt="S3" width={320} />
const template = <TemplateImage template="fixture-http" src="website/hero.jpg" alt="HTTP" />

// @ts-expect-error A source-specific catalog must reject another source's path.
const wrongCatalog = <Image source="products" src="website/hero.jpg" alt="Wrong source" />
// @ts-expect-error Storage and another source are mutually exclusive.
const ambiguous = <Image storage source="website" src="website/hero.jpg" alt="Ambiguous" />
// @ts-expect-error Without a configured default, omission must not guess the source.
const missingSource = <Image src="website/hero.jpg" alt="Missing source" />
// @ts-expect-error Arbitrary caller-selected templates are not configured sources.
const unknownTemplate = <TemplateImage template="untrusted" src="website/hero.jpg" alt="Unknown" />
// @ts-expect-error HTTP origins belong in the source configuration, not in a relative src.
const remoteUrl = <Image source="website" src="https://example.com/hero.jpg" alt="Remote" />

void [
  storage,
  http,
  s3,
  template,
  wrongCatalog,
  ambiguous,
  missingSource,
  unknownTemplate,
  remoteUrl,
]
