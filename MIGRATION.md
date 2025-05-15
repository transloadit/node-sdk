# Migration Guide: v3 → v4

v4 focuses on type-safety, clearer errors, and modern Node support. Most changes are mechanical.

## Breaking changes (quick scan)

- `TransloaditClient` (default export) ➜ **`{ Transloadit }`** (named export)
- Requires **Node >= 20**
- `createAssembly` input validated by `assemblyInstructionsSchema`
- `listAssemblies()` now returns `PaginationListWithCount<AssemblyIndexItem>` (was `ListedAssembly`)
- New errors: `ApiError`, `InconsistentResponseError`, `PollingTimeoutError`

## Upgrade in 4 steps

1. Update imports

```ts
-import TransloaditClient from 'transloadit'
+import { Transloadit, AssemblyInstructionsInput, AssemblyIndexItem } from 'transloadit'
```

2. Adapt assembly creation (now type-checked)

```ts
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

await transloadit.createAssembly(params)
```

3. Update list & status handling

```ts
const { items } = await transloadit.listAssemblies()
items.forEach((a: AssemblyIndexItem) => console.log(a.id, a.created))
```

4. Run your code on **Node 20+**.

## Why upgrade?

- IDE autocomplete for every Robot & parameter, as well as the API response
- Local schema validation catches mistakes before the request
- Improved error objects simplify debugging

## Heads-up

Schemas are still bit wider than we would like as the first priority when retrofitting our API with schemas/types, was modeling its behavior exactly, or we'd risk the types being a lie, and hence runtime type errors.

We'll also outfit our API's testsuite with these schemas, and this will allow us to gradually, over time, narrow what our API can respond, along with the schemas.
