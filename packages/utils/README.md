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
import {
  getSignedSmartCdnUrl,
  getSmartCdnUrl,
  parseSmartCdnUrl,
  signParams,
  stripSmartCdnAuth,
  verifyWebhookSignature,
} from '@transloadit/utils'

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

### Smart CDN URL grammar

The URL builders and parser share one grammar, so a URL built here parses back into the options
that built it (and vice versa):

```ts
// Unsigned, for workspaces that do not require signature authentication.
const publicUrl = getSmartCdnUrl({ workspace, template, input, urlParams: { w: 640 } })

// Inverse of the builders: percent-decodes once, keeps repeated params as arrays,
// and returns `auth_key`/`exp`/`sig` separately as `auth`.
const { workspace, template, input, urlParams, auth } = parseSmartCdnUrl(url)

// Drops `auth_key`, `exp`, `sig` (and api2's `hsh`), leaving every other byte untouched.
const unsigned = stripSmartCdnAuth(url)
```

`auth_key`, `exp`, and `sig` are reserved: signed builders replace them and the unsigned builder
omits them. Other fields, including `hsh`, round-trip through the builders and parser.

Both builders accept a `baseUrl` that replaces `https://{workspace}.tlcdn.com`, for example a local
api2's URL Transform endpoint `https://api2-devdock.transloadit.dev/file/{workspace}` (a literal
`{workspace}` is substituted). The signature does not cover the host, so treat `baseUrl` as trusted
configuration and never derive it from user input. Pass the same `baseUrl` to `parseSmartCdnUrl` to
parse URLs built with it.

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
  sourceDimensions: { height: 1600, width: 2400 },
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
- `getSmartCdnUrl(options)`: unsigned Smart CDN URL builder (same options minus credentials/expiry).
- `parseSmartCdnUrl(url, { baseUrl?, workspace? })`: parses a Smart CDN URL into
  `{ workspace, template, input, urlParams, auth?, baseUrl? }`; throws on anything else.
- `stripSmartCdnAuth(url)`: removes the signature parameters, byte-for-byte otherwise.
- `baseUrl` (option of both builders): trusted replacement for `https://{workspace}.tlcdn.com`.
- `signParamsSync(paramsString, authSecret, algorithm?)`: Node-only sync signature helper.
- `getSignedSmartCdnUrl(options)` from `@transloadit/utils/node`: synchronous Smart CDN URL signer.
- `getSignedSmartCdnImageCandidates(options)`: deterministic structured, signed AVIF and WebP
  candidates plus the original fallback URL. Supply `sourceDimensions` to prevent upscaling and
  keep both output dimensions within backend limits.
- `createSmartCdnImageCandidates(options, sign)` from `@transloadit/utils`: the same deterministic
  image policy with an injected synchronous signer, for framework and package adapters that own
  their credential boundary.
- `resolveSmartCdnImageFormats(formats)` and `resolveSmartCdnImageWidths(widths, maximumWidth?)`:
  shared validation and normalization for adapters that use a different image Built-in.
