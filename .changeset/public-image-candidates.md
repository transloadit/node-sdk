---
"@transloadit/utils": minor
---

Add `getSmartCdnImageCandidates` next to the signed candidate builder on the Node entry point.
Share candidate validation and URL encoding while omitting signatures and expiry for genuinely
public delivery. Callers can use receipt-derived version tags for stable, immutable cache keys.
