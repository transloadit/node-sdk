# @transloadit/utils

Shared runtime helpers used across Transloadit JavaScript SDKs.

## Install

```bash
npm install @transloadit/utils
```

## Web / Edge usage

Everything in the root export runs on WebCrypto, so it works in browsers (secure origins only:
`https://` or `localhost`), edge runtimes, and Node.

```ts
import { getSignedSmartCdnUrl, signParams, verifyWebhookSignature } from '@transloadit/utils'

const signature = await signParams(paramsString, authSecret)
const verified = await verifyWebhookSignature({
  rawBody,
  signatureHeader,
  authSecret,
})
const url = await getSignedSmartCdnUrl({
  workspace,
  template,
  input,
  authKey,
  authSecret,
})
```

## Node usage

```ts
import {
  getSignedSmartCdnImageCandidates,
  getSignedSmartCdnUrl,
  signParamsSync,
} from '@transloadit/utils/node'

const signature = signParamsSync(paramsString, authSecret)
const url = getSignedSmartCdnUrl({
  workspace,
  template,
  input,
  authKey,
  authSecret,
})
const imageCandidates = getSignedSmartCdnImageCandidates({
  authKey,
  authSecret,
  // Reuse one absolute expiry across a build instead of recomputing it per request.
  expiresAt,
  input: 'https://example.com/image.jpg',
  widths: [320, 640, 960],
  workspace,
})

for (const source of imageCandidates.sources) {
  console.log(source.format, source.quality, source.candidates)
}
```

## API

- `signParams(paramsString, authSecret, algorithm?)`: WebCrypto-based HMAC signature for params
  (`sha1`, `sha256`, `sha384`, `sha512`).
- `verifyWebhookSignature({ rawBody, signatureHeader, authSecret })`: validates webhook signatures.
- `getSignedSmartCdnUrl(options)`: async, WebCrypto-based Smart CDN URL signer. Byte-identical to
  the Node variant below.
- `signParamsSync(paramsString, authSecret, algorithm?)`: Node-only sync signature helper.
- `getSignedSmartCdnUrl(options)` from `@transloadit/utils/node`: synchronous Smart CDN URL signer.
- `getSignedSmartCdnImageCandidates(options)`: deterministic structured, signed AVIF and WebP
  candidates plus the original fallback URL.
