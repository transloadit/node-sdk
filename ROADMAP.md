# Roadmap

- Support more platforms than Node.js https://github.com/transloadit/node-sdk/issues/153
- Other improvements, see https://github.com/transloadit/node-sdk/issues/89
- Add JSON Schema export for v4 (`@transloadit/jsonschema` or subpath) once zod v4 tooling is
  stable.
- Consider promoting alphalib into its own workspace package if/when all consuming repos are
  v4-ready.
- Revisit `got@15+` once we can raise the Node.js support floor to Node.js 22+ and replace
  `form-data` request bodies with native `FormData` plus `Blob`/`File` inputs.
