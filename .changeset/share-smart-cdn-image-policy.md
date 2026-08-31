---
"@transloadit/utils": minor
---

Add a framework-neutral `createSmartCdnImageCandidates` policy with an injected signer, and make
the existing Node candidate helper share it. Optional intrinsic source dimensions now prevent
upscaling and renditions whose derived height exceeds Smart CDN's image limit. Framework adapters
can reuse the exported format and width normalization instead of copying those limits.

Candidate policy now distinguishes millisecond timestamps from accidentally seconds-based expiry
values and reports an invalid width by its index. Runtime `null` qualities are rejected consistently
with the exported TypeScript contract instead of being treated as an omitted format.

Ignore a legacy caller-provided `sig` while signing instead of including a value that the generated
signature replaces, which could otherwise produce an unverifiable URL.
Unsigned URLs now omit caller-provided `auth_key`, `exp`, and `sig` fields so they remain
unambiguously unsigned and round-trip through the parser.
