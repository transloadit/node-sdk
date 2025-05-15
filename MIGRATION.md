# Migration Guide: SDK v3.x to v4.x

This guide outlines the key changes and steps required to migrate your application from version 3.x of the SDK to the 4.x series. The primary focus of this release is to enhance type safety and provide more robust error handling, especially around Assembly creation parameters, Assembly Status objects, and list operations, by leveraging Zod schemas (which are also exported from the package).

## Core Improvements in v4.x

- **Enhanced Type Safety:** Assembly status objects and items in assembly lists are now parsed against strict Zod schemas, providing more reliable and accurate TypeScript types.
- **Improved Error Reporting:** When the API returns data that doesn't conform to the expected schema (e.g., for Assembly status), a detailed `InconsistentResponseError` is thrown, making it easier to identify API contract violations or unexpected responses.
- **Modernized Internal Types:** Manual type definitions for assembly listings have been replaced with Zod-inferred types.

## Breaking Changes

Please review these breaking changes carefully and update your code accordingly.

### 1. Assembly Status Handling (`getAssembly`, `cancelAssembly`, `awaitAssemblyCompletion`)

- **Stricter Return Types:**
  - Methods like `transloadit.getAssembly(id)`, `transloadit.cancelAssembly(id)`, and `transloadit.awaitAssemblyCompletion(id)` now return a strictly typed `AssemblyStatus` object. This type is inferred directly from the `assemblyStatusSchema` Zod schema.
  - Previously, the returned object might have been more loosely typed.
- **New Error on Schema Mismatch:**
  - If the API response for an assembly status does not conform to `assemblyStatusSchema`, an `InconsistentResponseError` will be thrown. The error message will include a human-readable summary of the validation failures, powered by `zodParseWithContext`.
  - This is a change from potentially returning partial/incorrect data or a different error type.

**Migration Steps:**

- Review any code that consumes the results of these methods.
- Update type annotations if you were explicitly typing the results to an older, manual `AssemblyStatus` type. Rely on the SDK's exported `AssemblyStatus` type.
- Be prepared to handle `InconsistentResponseError` for schema validation issues.
- Access to properties on the `AssemblyStatus` object will now be strictly enforced by TypeScript based on the Zod schema (e.g., optional fields are correctly typed as optional).

**Example (Conceptual):**

```typescript
// Old v3.x style (may have had looser typing)
// const assembly = await transloadit.getAssembly(id);
// if (assembly.ok === 'ASSEMBLY_COMPLETED') { /* ... */ }

// New v4.0.0 style
import { Transloadit, AssemblyStatus, InconsistentResponseError } from 'transloadit' // Adjust import path

try {
  const assembly: AssemblyStatus = await transloadit.getAssembly(id)
  // Autocomplete and type checking are now based on assemblyStatusSchema
  if (assembly.ok === 'ASSEMBLY_COMPLETED') {
    // assembly.results will be correctly typed
  } else if (assembly.error) {
    // assembly.message, assembly.reason etc., will be typed
  }
} catch (err) {
  if (err instanceof InconsistentResponseError) {
    console.error('API response did not match expected schema:', err.message)
    // err.message contains detailed validation issues from zodParseWithContext
  } else {
    // Handle other errors
  }
}
```

### 2. Listing Assemblies (`listAssemblies`)

- **Replaced `ListedAssembly` with `AssemblyIndexItem`:**
  - The `transloadit.listAssemblies(params)` method now returns a `Promise<PaginationListWithCount<AssemblyIndexItem>>`.
  - The old manually defined `ListedAssembly` interface has been removed.
  - `AssemblyIndexItem` is a new Zod-inferred type defined by `assemblyIndexItemSchema`. This schema aims to accurately represent the summarized data returned for each assembly in the list.
- **Schema Validation for List Items:**
  - Each item in the `items` array of the response is parsed against `assemblyIndexItemSchema`.
  - If any item fails validation, or if the overall list structure is malformed, an `InconsistentResponseError` is thrown with details.

**Migration Steps:**

- Update code that iterates over `(await transloadit.listAssemblies()).items`.
- Change any type annotations from `ListedAssembly` to `AssemblyIndexItem`.
- Adjust property access based on the fields defined in `AssemblyIndexItem`. While many fields are similar to the old `ListedAssembly`, their optionality or exact types might have been refined by the Zod schema.
- Be prepared to handle `InconsistentResponseError`.

**Example (Conceptual):**

```typescript
// Old v3.x style
// const { items, count } = await transloadit.listAssemblies();
// items.forEach((assembly: ListedAssembly) => { /* ... */ });

// New v4.0.0 style
import { AssemblyIndexItem, PaginationListWithCount } from 'transloadit' // Adjust import path

try {
  const result: PaginationListWithCount<AssemblyIndexItem> = await transloadit.listAssemblies()
  result.items.forEach((item: AssemblyIndexItem) => {
    // item properties are now strictly typed by assemblyIndexItemSchema
    console.log(item.id, item.ok, item.error, item.created)
  })
} catch (err) {
  if (err instanceof InconsistentResponseError) {
    console.error('API response for listAssemblies was invalid:', err.message)
  } else {
    // Handle other errors
  }
}
```

### 3. Metadata Handling in `AssemblyStatus` (`assemblyStatusMetaSchema`)

- The `meta` object within an `AssemblyStatus` (and potentially within `AssemblyIndexItem` if it includes a similar meta structure) is now parsed using a schema with `.passthrough()`.
- **Effect:** Known metadata fields are still validated. However, if the API returns new, unrecognized metadata fields, they will be included in the parsed `meta` object without causing a parsing error.
- This is generally a non-breaking improvement for consumers, enhancing forward compatibility. You will get autocompletion for known keys, and new keys won't break your application.

## Benefits of Upgrading

- **Increased Reliability:** Catch API inconsistencies and unexpected data structures early.
- **Improved Developer Experience:** More accurate TypeScript types mean better autocompletion, less guesswork, and fewer runtime errors related to unexpected data shapes.
- **Clearer Error Diagnostics:** Schema validation failures point directly to the problematic parts of the API response.

---

To ensure a smooth migration, please test your integration thoroughly after upgrading and adapting your code to these changes. If you encounter issues not covered by this guide, or if the API behavior differs from the SDK's expectations, please consult the SDK documentation or raise an issue.
