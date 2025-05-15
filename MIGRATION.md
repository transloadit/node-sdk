# Migration Guide: SDK v3.x to v4.x

This guide outlines the key changes and steps required to migrate your application from version 3.x of the SDK to the 4.x series. The primary focus of this release is to enhance type safety and provide more robust error handling, especially around Assembly creation parameters, Assembly Status objects, and list operations, by leveraging Zod schemas (which are also exported from the package).

## Core Improvements in v4.x

- **Comprehensive Type Safety with Zod:** The entire SDK has been significantly refactored, with a primary focus on using Zod schemas for:
  - **Assembly Creation Parameters:** Defining Assembly Steps and Robot parameters (via `transloadit.createAssembly()`) is now fully type-safe, providing autocompletion and validation for all Robots and their options.
  - **API Responses:** Assembly status objects, items in assembly lists, and other API responses are parsed against strict Zod schemas, providing more reliable and accurate TypeScript types.
- **Improved Error Reporting:**
  - Invalid Assembly creation parameters will now often result in client-side errors or more specific API errors.
  - When the API returns data that doesn't conform to the expected schema (e.g., for Assembly status), a detailed `InconsistentResponseError` is thrown, making it easier to identify API contract violations or unexpected responses.
- **Modernized Codebase:** The SDK has largely transitioned from JavaScript to TypeScript.
- **Exported Schemas and Types:** Core Zod schemas (like `assemblyInstructionsSchema`, `assemblyStatusSchema`, `assemblyIndexItemSchema`, and individual Robot schemas) and their inferred TypeScript types are now exported, allowing you to leverage them in your own code for validation or typing if needed.

## Breaking Changes

Please review these breaking changes carefully and update your code accordingly.

### 1. Type-Safe Assembly Creation (`createAssembly` parameters)

This is one of the most significant enhancements in v4.x. In v3.x, the parameters object for `createAssembly` was loosely typed, and validation was primarily handled by the Transloadit API server-side.

- **Stricter Input Validation for Assembly Instructions:**

  - The `params` object passed to `transloadit.createAssembly(params)` is now rigorously validated against the `assemblyInstructionsSchema` Zod schema. This includes the `steps` object, `auth`, `notify_url`, `fields`, `template_id`, and all individual Robot parameters within each step.
  - If the provided parameters do not conform to the schema (e.g., incorrect Robot name, misspelled parameter, invalid value type, missing required parameter for a Robot), the `createAssembly` method may throw an error client-side before making an API request, or the API request itself will likely fail with a `400 Bad Request` containing more specific error details from the server, which are then wrapped in an `ApiError`.
  - This provides immediate and precise feedback on errors in your Assembly definitions.

- **New Input Types & Improved Autocompletion:**
  - For TypeScript users, the SDK exports types like `AssemblyInstructionsInput` and `StepInput` (derived from Zod schemas). Using these will greatly improve type checking and autocompletion in your IDE when constructing assembly parameters.
  - Autocompletion for Robot names and their specific parameters (e.g., `width` for `/image/resize`, `asr_provider` for `/speech/transcribe`) is now available and type-checked.

**Migration Steps:**

- **Review All `createAssembly` Calls:** This is the most critical migration step for assembly creation.
  - Carefully examine the structure of the `params` argument you pass to `transloadit.createAssembly()`.
  - Ensure it aligns with the `assemblyInstructionsSchema`. Pay close attention to the `steps` object: each key is a step name, and its value must be an object conforming to the schema for the specified `robot`.
- **Update Robot Parameters:**
  - Robot names (e.g., `robot: '/image/resize'`) and their parameters are now strictly defined. Misspellings or use of old/deprecated parameters will cause errors.
  - Consult the official Transloadit documentation for each Robot and leverage the SDK's autocompletion and TypeScript type hints to ensure correctness.
  - Many common parameters like `use` (for specifying input steps) are also type-checked.
- **Utilize Exported Schemas/Types (Recommended for TypeScript):**
  - Import `AssemblyInstructionsInput` to type your parameters object:
    `import { AssemblyInstructionsInput } from 'transloadit';`
    `const params: AssemblyInstructionsInput = { ... };`
  - For complex, dynamically generated steps, you might even use the exported `stepSchema` or individual Robot schemas for pre-validation if needed.
- **Error Handling:** Update your error handling around `createAssembly` calls. Expect that errors for invalid step definitions might occur more frequently client-side or result in more detailed API errors if they still reach the server.

**Example (Conceptual):**

```typescript
// Old v3.x style (anything went, errors caught by API server)
// await transloadit.createAssembly({
//   steps: {
//     my_resize: {
//       robot: '/image/resize',
//       widthh: 100, // Typo, might have been ignored or caused vague server error
//       non_existent_param: 'foo'
//     }
//   }
// });

// New v4.x style
import { Transloadit, AssemblyInstructionsInput, ApiError } from 'transloadit' // Adjust import path

const transloadit = new Transloadit({ authKey: 'YOUR_KEY', authSecret: 'YOUR_SECRET' })

const params: AssemblyInstructionsInput = {
  steps: {
    my_resize: {
      robot: '/image/resize',
      width: 100, // Correctly typed and validated
      height: 50,
      use: ':original', // Also type-checked
    },
    watermarked: {
      robot: '/video/watermark',
      use: 'my_resize',
      image_url: 'https://example.com/watermark.png',
      position: 'bottom-right',
    },
  },
}

try {
  const assembly = await transloadit.createAssembly(params)
  console.log('Assembly created:', assembly.assembly_id)
} catch (err) {
  if (err instanceof ApiError) {
    console.error('API Error:', err.message, err.assemblyId, err.response?.body)
  } else if (err instanceof InconsistentResponseError) {
    console.error('Inconsistent Response:', err.message)
  } else {
    console.error('Error creating assembly:', err)
    // If params were invalid client-side, err might be a ZodError directly
    // or a custom error from the SDK wrapping it, depending on internal handling.
    // The SDK aims to provide clear errors before API calls if possible.
  }
}
```

### 2. Assembly Status Handling (`getAssembly`, `cancelAssembly`, `awaitAssemblyCompletion`)

- **Stricter Return Types:**
  - Methods like `transloadit.getAssembly(id)`, `transloadit.cancelAssembly(id)`, and `transloadit.awaitAssemblyCompletion(id)` now return a strictly typed `AssemblyStatus` object. This type is inferred directly from the `assemblyStatusSchema` Zod schema.
  - Previously, the returned object might have been more loosely typed.
- **New Error on Schema Mismatch:**
  - If the API response for an assembly status does not conform to `assemblyStatusSchema`, an `InconsistentResponseError` will be shown (not thrown, yet). The error message will include a human-readable summary of the validation failures. We still pass the raw response back to your program, as we are still iterating on our schemas, and do not want to risk unnecesary throwings of errors. Without the possibility to mass-update all node-sdk installs, these could pop up for a long time to come.

### 3. Listing Assemblies (`listAssemblies`)

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

// New v4.x style
import { Transloadit, AssemblyIndexItem, PaginationListWithCount } from 'transloadit' // Adjust import path

// const transloadit = new Transloadit({ ... });
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

### 4. Metadata Handling in `AssemblyStatus` (`assemblyStatusMetaSchema`)

- The `meta` object within an `AssemblyStatus` (and potentially within `AssemblyIndexItem` if it includes a similar meta structure) is now parsed using a schema with `.passthrough()`.
- **Effect:** Known metadata fields are still validated. However, if the API returns new, unrecognized metadata fields, they will be included in the parsed `meta` object without causing a parsing error.
- This is generally a non-breaking improvement for consumers, enhancing forward compatibility. You will get autocompletion for known keys, and new keys won't break your application.

### 5. General SDK Structure and Other Changes

- **TypeScript First:** The SDK codebase is now primarily TypeScript, providing better internal consistency and enabling more robust type generation.
- **Custom Error Types:** New error classes like `ApiError`, `InconsistentResponseError`, and `PollingTimeoutError` are used for more specific error handling. Check their properties for more context on errors.
- **Removed `types/index.d.ts`:** Manually maintained `.d.ts` files are no longer needed as types are generated from the TypeScript source or inferred from Zod schemas.
- **Build System:** The build system has been modernized (e.g., using `vitest` for testing).

## Benefits of Upgrading

- **Dramatically Increased Reliability:** Catch Assembly definition errors client-side, and API inconsistencies and unexpected data structures early with Zod schema validation.
- **Vastly Improved Developer Experience:** Accurate TypeScript types and Zod schemas provide excellent autocompletion for Assembly Instructions (including all Robot parameters) and API responses, reducing guesswork and runtime errors.
- **Clearer Error Diagnostics:** Schema validation failures and new custom errors point directly to the problematic parts of your Assembly definitions or API responses.

---

To ensure a smooth migration, please test your integration thoroughly after upgrading and adapting your code to these changes. If you encounter issues not covered by this guide, or if the API behavior differs from the SDK's expectations, please consult the SDK documentation or raise an issue.
