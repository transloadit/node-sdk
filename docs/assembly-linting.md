# Assembly Linting

## CLI

```bash
# Lint a steps file
npx transloadit assemblies lint --steps steps.json

# Lint from stdin
cat steps.json | npx transloadit assemblies lint --steps -

# Lint with template merge
npx transloadit assemblies lint --template TEMPLATE_ID --steps steps.json

# Treat warnings as fatal
npx transloadit assemblies lint --steps steps.json --fatal warning

# Auto-fix in place
npx transloadit assemblies lint --steps steps.json --fix

# Auto-fix from stdin (writes fixed JSON to stdout)
cat steps.json | npx transloadit assemblies lint --fix > fixed.json
```

When both `--template` and `--steps` are provided, Transloadit merges the template content with
the provided steps before linting, matching the API's runtime behavior. If the template sets
`allow_steps_override=false`, providing steps will fail with `TEMPLATE_DENIES_STEPS_OVERRIDE`.

## SDK (Node.js)

### `async lintAssemblyInstructions(options)`

Lint Assembly Instructions locally using the same linter as the API.
If you provide a `templateId`, the template content is fetched and merged with your instructions
before linting (matching the API's runtime merge behavior). If the template sets
`allow_steps_override=false`, providing steps will throw `TEMPLATE_DENIES_STEPS_OVERRIDE`.

The `options` object accepts:

- `assemblyInstructions` - Assembly Instructions as a JSON string, a full instructions object, or a steps-only object.
  If no `steps` property is present, the object is treated as steps.
- `templateId` - Optional template ID to merge before linting.
- `fatal` - `'error' | 'warning'` (default: `'error'`). When set to `'warning'`, warnings are treated as fatal.
- `fix` - Apply auto-fixes where possible. If `true`, the result includes `fixedInstructions`.

The method returns:

- `success` - `true` when no fatal issues are found.
- `issues` - Array of lint issues (each includes `code`, `type`, `row`, `column`, and `desc`).
- `fixedInstructions` - The fixed JSON string when `fix` is `true` (steps-only inputs return steps-only JSON).

Example:

```js
const result = await transloadit.lintAssemblyInstructions({
  assemblyInstructions: {
    resize: { robot: '/image/resize', use: ':original', width: 100, height: 100 },
  },
  fatal: 'warning',
})

if (!result.success) {
  console.log(result.issues)
}
```
