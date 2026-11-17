---
---

No release needed: the schemas behind `@transloadit/zod` are now maintained as Zod 4 source, and
the Zod 3 export and the SDK's Zod 3 schema copy are generated from it. A fresh build of
`@transloadit/zod`, `@transloadit/types`, `@transloadit/node` and `transloadit` is byte-identical
to the previous one, so no contract or SDK surface changes.
