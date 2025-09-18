# Migration Guide: v3 → v4

Version 4 focuses on type-safety, clearer errors, and modern Node support. Most updates are mechanical, but there are a few breaking changes that need attention.

## TL;DR checklist

- [ ] Ensure your runtime is Node.js **20 or newer**.
- [ ] Switch from the v3 default export to the named `{ Transloadit }` ESM export.
- [ ] Adopt the new typed assembly instructions (`AssemblyInstructionsInput`) and update code that reads `listAssemblies()` results.
- [ ] Adjust error handling to account for the new `ApiError`, `InconsistentResponseError`, and `PollingTimeoutError` classes.
- [ ] (Optional) Opt into `validateResponses` or use `getSignedSmartCDNUrl` if you need the new safeguards and helpers.

## Before you begin

- Update `transloadit` to `^4.0.0` in `package.json` and reinstall dependencies.
- Node 20+ is required. Tooling such as `ts-node`, Jest, or your bundler must be ESM-aware.
- The SDK ships with `"type": "module"` and `.d.ts` typings. Pure CommonJS projects will need to either migrate to ESM or load the client via `import()` inside async code.

```js
// CommonJS example
async function getClient() {
  const { Transloadit } = await import('transloadit')
  return new Transloadit({
    authKey: process.env.TRANSLOADIT_KEY ?? '',
    authSecret: process.env.TRANSLOADIT_SECRET ?? '',
  })
}
```

## 1. Update imports

`TransloaditClient` (default export) was removed. Import `Transloadit` (and any helper types) as named exports.

```ts
-import TransloaditClient from 'transloadit'
-const transloadit = new TransloaditClient(opts)
+import { Transloadit, AssemblyInstructionsInput, AssemblyStatus } from 'transloadit'
+const transloadit = new Transloadit(opts)
```

The package also exports `AssemblyInstructionsInput`, `AssemblyIndexItem`, `AssemblyStatus`, and the error classes so you can type your own helpers.

## 2. Adopt typed assembly instructions

`createAssembly` now validates its `params` using rich schemas. TypeScript users get autocomplete for every robot and parameter out of the box.

```ts
const params: AssemblyInstructionsInput = {
  steps: {
    resize: {
      use: ':original',
      robot: '/image/resize',
      width: 320,
      height: 240,
      result: true,
    },
  },
}

await transloadit.createAssembly({ params, waitForCompletion: true })
```

If validation fails, `createAssembly` throws an `ApiError` before making a network request, helping you catch mistakes locally.

## 3. Adjust API result handling

- `listAssemblies()` now returns a `PaginationListWithCount<AssemblyIndexItem>` instead of the legacy `ListedAssembly` array.

  ```ts
  const { items, count } = await transloadit.listAssemblies()
  items.forEach((assembly) => console.log(assembly.id, assembly.status))
  ```

- `AssemblyStatus` objects are now fully typed. Update any custom helpers to use the exported types instead of hand-rolled interfaces.
- The pagination helpers (`PaginationStream`) are written in TypeScript and ship `.d.ts` files; imports work the same, but you can lean on the IDE for guidance now.

## 4. Update error handling

- `ApiError` wraps responses that contain an `error` payload even when the HTTP status code is 2xx. It carries `assemblyId`, `transloaditErrorCode`, and the raw `body`.
- `InconsistentResponseError` is thrown if the Transloadit API omits critical fields (for example, missing assembly URLs).
- `PollingTimeoutError` is thrown when waiting for an assembly to finish via `waitForCompletion` exceeds the timeout.

```ts
try {
  await transloadit.createAssembly({ params })
} catch (error) {
  if (error instanceof ApiError && error.assemblyId) {
    console.error(
      'Troubleshoot at https://transloadit.com/c/assemblies/' + error.assemblyId
    )
  }
  throw error
}
```

## 5. Optional enhancements

- `validateResponses` (client option) replays schema validation against responses you receive. Enable it when integrating with new workflows to surface unexpected fields early:

  ```ts
  const transloadit = new Transloadit({
    authKey,
    authSecret,
    validateResponses: true,
  })
  ```

- `getSignedSmartCDNUrl` generates Smart CDN URLs with signatures that match the server-side implementation:

  ```ts
  const signedUrl = transloadit.getSignedSmartCDNUrl({
    workspace: 'my-team',
    template: 'hero-image',
    input: 'landing.jpg',
    urlParams: { format: 'webp' },
  })
  ```

## Testing & troubleshooting

- Run your existing integration tests on Node 20+. If you relied on CommonJS `require`, convert those modules or wrap calls in `import()` shims as shown above.
- If TypeScript raises errors about unfamiliar properties, import the respective types from `transloadit` instead of redefining them.
- Schemas intentionally mirror the current public API. Some properties remain permissive while we tighten validation in the API itself; report gaps if the SDK raises or misses invalid data.

## Additional resources

- The [CHANGELOG](./CHANGELOG.md) summarises every change since v3.0.2.
- Reach out to support@transloadit.com if you encounter schema validation mismatches or missing robot definitions.
