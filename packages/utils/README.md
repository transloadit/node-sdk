# @transloadit/utils

Shared runtime helpers used across Transloadit JavaScript SDKs.

## Install

```bash
npm install @transloadit/utils
```

## Web / Edge usage

```ts
import { signParams, verifyWebhookSignature } from '@transloadit/utils'

const signature = await signParams(paramsString, authSecret)
const verified = await verifyWebhookSignature({
  rawBody,
  signatureHeader,
  authSecret,
})
```

## Node usage

```ts
import { signParamsSync, getSignedSmartCdnUrl } from '@transloadit/utils/node'

const signature = signParamsSync(paramsString, authSecret)
const url = getSignedSmartCdnUrl({
  workspace,
  template,
  input,
  authKey,
  authSecret,
})
```

## API

- `signParams(paramsString, authSecret, algorithm?)`: WebCrypto-based HMAC signature for params.
- `verifyWebhookSignature({ rawBody, signatureHeader, authSecret })`: validates webhook signatures.
- `signParamsSync(paramsString, authSecret, algorithm?)`: Node-only sync signature helper.
- `getSignedSmartCdnUrl(options)`: Node-only Smart CDN URL signer.
