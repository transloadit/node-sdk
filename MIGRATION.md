# Migration Guide: SDK v3.x to v4.x

This guide summarizes key changes and migration steps from SDK v3.x to v4.x, focusing on enhanced type safety, improved error handling, and Zod schema validation.

## Key Changes in v4.x

- Renamed `TransloaditClient` to `Transloadit`
- Use named export for `Transloadit`, instead of default export.
- Dropped support for Node.js < 20.
- **Type Safety with Zod:** Assembly creation parameters and API responses are now validated using Zod schemas, providing accurate TypeScript types and IDE autocompletion. The main benefit for customers is less trips to the documentation as they are typing Assembly Instructions. Robot names and their available parameters are now all autocompleted.
- **Improved Error Reporting:** Clearer client-side and API errors (`ApiError`, `InconsistentResponseError`) help quickly identify issues.
- **Exported Schemas and Types:** Core schemas (`assemblyInstructionsSchema`, `assemblyStatusSchema`, etc.) and inferred types (`AssemblyInstructionsInput`, `AssemblyIndexItem`) are exported for reuse.
- **Modernized Codebase:** Fully transitioned to TypeScript, removing manual `.d.ts` files.

## Migration Steps

### 1. Assembly Creation (`createAssembly`)

- Parameters are strictly validated against `assemblyInstructionsSchema`.
- Incorrect Robot names, parameters, or types now cause immediate client-side errors or detailed API errors.

**Migration Steps:**

- Review and update all `createAssembly` calls to match the schema.
- Use exported types for better IDE support:

```typescript
import { Transloadit, AssemblyInstructionsInput } from 'transloadit'

const transloadit = new Transloadit({ authKey: 'YOUR_KEY', authSecret: 'YOUR_SECRET' })

const params: AssemblyInstructionsInput = {
  steps: {
    resize: {
      use: ':original',
      robot: '/image/resize',
      width: 100,
      height: 50,
    },
  },
}

const assembly = await transloadit.createAssembly(params)
```

### 2. Assembly Status Methods (`getAssembly`, `cancelAssembly`, `awaitAssemblyCompletion`)

- Methods now return strictly typed `AssemblyStatus` objects.
- Schema mismatches trigger an `InconsistentResponseError` (logged, not thrown yet).

### 3. Listing Assemblies (`listAssemblies`)

- Returns `PaginationListWithCount<AssemblyIndexItem>` instead of `ListedAssembly`.
- Items validated against `assemblyIndexItemSchema`.

**Migration Steps:**

- Update type annotations from `ListedAssembly` to `AssemblyIndexItem`.

```typescript
const result = await transloadit.listAssemblies()
result.items.forEach((item: AssemblyIndexItem) => {
  console.log(item.id, item.ok, item.created)
})
```

### 4. General Changes

- New custom errors (`ApiError`, `InconsistentResponseError`, `PollingTimeoutError`).
- Modernized build system and testing (`vitest`).
- Make sure you are on Node.js 20 or higher.

## Benefits of Upgrading

- **Increased Reliability:** Early detection of errors through schema validation.
- **Improved Developer Experience:** Accurate types and autocompletion reduce guesswork.
- **Clearer Diagnostics:** Specific errors pinpoint exact issues.

## Closing Thoughts

Transloadit is retrofitting types on an 15 year old codebase. The path we chose is to:

1. create schemas that model closely what the API currently outputs, and allows as inputs
2. roll out the schemas in clients, and our test suite, even though they are not as narrow as we would like yet
3. gradually narrow the schemas, our test suite will raise red flags, so we can adjust the API (unless it would break backwards compatibility)
4. we rinse and repeat, until our API is as narrow as we like our schemas/types to be

We are currently at step 2, this means you'll find fairly wide types, but at least they do not lie, so that you should be able to build your integration on them without runtime type errors.

Please Test your integration thoroughly after upgrading. For issues or unexpected behavior, consult the SDK documentation or raise an issue.
