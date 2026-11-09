# @transloadit/types

**Stability:** Exported names follow strict SemVer. API contract types and schemas
follow API2 and can change in minor releases, including type-breaking updates. See the
[versioning policy](https://github.com/transloadit/node-sdk/blob/main/CONTRIBUTING.md#versioning-policy).

- Commit your lockfile and type-check dependency update PRs.
- Use `~` ranges for stable contract types within a minor; patch releases do not change contract
  types. Use `^` to follow the API as it evolves.
- Use input types for instructions you write, such as `AssemblyInstructionsInput`; narrow fields
  from responses and parsed output before use (`null`, `undefined`, unknown strings).

This package provides type-only exports generated from Transloadit schemas.

For the SDK client, use `@transloadit/node` or the unscoped `transloadit` package.
