---
'@transloadit/utils': minor
---

Add an isomorphic `getSignedSmartCdnUrl` to the root export. It signs with WebCrypto, so browsers,
edge runtimes and Node produce byte-identical Smart CDN URLs to the synchronous signer in
`@transloadit/utils/node`, which now shares the same URL-building code. `signParams` and
`verifyWebhookSignature` additionally accept `sha512`, matching `signParamsSync`.
