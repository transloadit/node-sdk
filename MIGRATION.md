# Migration Guide: v3 → v4

Version 4 focuses on type-safety, clearer errors, and modern Node support. Most updates are mechanical, but there are a few breaking changes that need attention.

## TL;DR checklist

- [ ] Ensure your runtime is Node.js **20 or newer**.
- [ ] Switch from the v3 default export to the named `{ Transloadit }` ESM export.
- [ ] Adopt the new typed assembly instructions (`AssemblyInstructionsInput`) and update code that reads `listAssemblies()` results.
- [ ] Migrate from `TransloaditError` to `ApiError` signature.
- [ ] (Optional) Opt into `validateResponses` or use `getSignedSmartCDNUrl` if you need the new safeguards and helpers.

## Before you begin

- Update `transloadit` to `^4.0.0` in `package.json` and reinstall dependencies.
- Node 20+ is required. Tooling such as `ts-node`, Jest, or your bundler must be ESM-aware.
- The SDK ships with `"type": "module"` and `.d.ts` typings. Pure CommonJS projects will need to either migrate to ESM or load the client via `import()` inside async code.

```js
// CommonJS import example
async function getClient() {
  const { Transloadit } = await import("transloadit");
  return new Transloadit({
    authKey: process.env.TRANSLOADIT_KEY ?? "",
    authSecret: process.env.TRANSLOADIT_SECRET ?? "",
  });
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

`createAssembly` now validates its `params` using rich TypeScript types, and users get autocomplete for every robot and parameter out of the box.

```ts
const params: AssemblyInstructionsInput = {
  steps: {
    resize: {
      use: ":original",
      robot: "/image/resize",
      width: 320,
      height: 240,
      result: true,
    },
  },
};

await transloadit.createAssembly({ params, waitForCompletion: true });
```

## 3. Adjust API result handling

`AssemblyStatus` objects are now fully typed. Update any custom helpers to use the exported types instead of hand-rolled interfaces.

```ts
// `createdAssembly` is fully typed
const createdAssembly = await transloadit.createAssembly(...);
```

## 4. Update error handling

`TransloaditError` has been renamed to `ApiError`. Key differences between `TransloaditError` and `ApiError`:

- This error is also thrown when `body.error` is set, even if status from server is 2xx.
- `TransloaditError.response.body` can now be found in `ApiError.response`.
- `TransloaditError.assemblyId` can now be found in `ApiError.response.assembly_id`.
- `TransloaditError.transloaditErrorCode` can now be found in `ApiError.response.error`.
- `ApiError` does not inherit from `got.HTTPError`, but `ApiError.cause` will be the `got.HTTPError` instance that caused this error, except for when Tranloadit API responds with HTTP 200 and `error` prop set in JSON response (in which case `cause` will be `undefined`).
- Note that (just like before) when the Transloadit API responds with an error we will always throw an `ApiError` - In all other cases (like request timeout, connection error, TypeError etc.), we don't wrap the error in `ApiError`.

```ts
try {
  await transloadit.createAssembly({ params });
} catch (error) {
  if (error instanceof ApiError && error.response.assembly_id) {
    console.error(
      "Troubleshoot at https://transloadit.com/c/assemblies/" +
        error.response.assembly_id
    );
  }
  throw error;
}
```

## 5. Optional enhancements

- `validateResponses` (client option) runs schema validation against responses you receive from Transloadit's servers. It will then throw additional `InconsistentResponseError` errors if responses are inconsistent with the schema. This will normally not happen, but enabling this will catch any bugs in Transloadit's API code where the response does not (yet) adhere with the schemas, instead of silently accepting the types as something else than what you expect (which is the case when the value is `false` - the default). We are of course working on making sure all our responses adhere to the schemas. In the future we want to make this option default to `true`.

  ```ts
  const transloadit = new Transloadit({
    authKey,
    authSecret,
    validateResponses: true,
  });
  ```

- `getSignedSmartCDNUrl` generates Smart CDN URLs with signatures that match the server-side implementation:

  ```ts
  const signedUrl = transloadit.getSignedSmartCDNUrl({
    workspace: "my-team",
    template: "hero-image",
    input: "landing.jpg",
    urlParams: { format: "webp" },
  });
  ```

## 6. Removed `createAssembly` callback support

Use the returned promise instead.

## 7. Removed `isResumable` option

Only Tus uploads (which we call resumable uploads) are now supported using the SDK, and this option has therefore been removed.

## 8. `form-data` testing

`form-data` upgraded from 3 to 4 - this might cause some subtle differences in behavior related to file uploads. Be sure to test file uploads.

## 9. `got` upgraded

As a consequence of upgrading `got` to v14, the `gotRetry` option no longer accepts `number`. Instead use `{ limit: 0 }`. See [`got` `retry` object documentation](https://github.com/sindresorhus/got/blob/v14.4.9/documentation/7-retry.md).

## Testing & troubleshooting

- Run your existing integration tests on Node 20+. If you relied on CommonJS `require`, convert those modules or wrap calls in `import()` shims as shown above.
- If TypeScript raises errors about unfamiliar properties, import the respective types from `transloadit` instead of redefining them.
- Schemas intentionally mirror the current public API. Some properties remain permissive while we tighten validation in the API itself; report gaps if the SDK raises or misses invalid data.

## Additional resources

- The [CHANGELOG](./CHANGELOG.md) summarises every change since v3.0.2.
- Reach out to support@transloadit.com if you encounter schema validation mismatches or missing robot definitions.
