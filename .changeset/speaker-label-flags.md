---
'@transloadit/node': minor
'transloadit': minor
---

Add `--speaker-labels` and `--max-speakers` to `transloadit speech transcribe`. With
`--speaker-labels` and no `--provider`, the API picks a provider that can label speakers instead of
the CLI forcing `replicate`; combining it with `--provider replicate`, or `--max-speakers` without
`--speaker-labels`, fails before an Assembly is created.
