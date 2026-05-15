# Transloadit Repository Guide
## coding style

Coding style:

- Favor `async run() {` over `run = async () => {` inside ES6 classes
- Favor `if (!(err instanceof Error)) { throw new Error(`Was thrown a non-error: ${err}`) }` inside
  `catch` blocks to ensure the `error` is always an instance of `Error`
- Favor using real paths (`../lib/schemas.ts`) over aliases (`@/app/lib/schemas`).
- Favor `for (const comment of comments) {` over `comments.forEach((comment) => {`
- Favor named exports over default exports, with the exception of Next.js pages
- Avoid namespace `*` imports unless the API is intentionally consumed as a namespace. Prefer named
  imports so usage is explicit and bundlers can optimize.
- Avoid broad file-level lint suppressions. Prefer the narrowest scoped suppression on the exact
  line, with a reason when the exception is not obvious.
- Preserve existing dependency import paths and module-system interop unless the change is required
  and explained. Do not rewrite package imports to `node_modules/...`, switch ESM/CJS shapes, or add
  duplicate export styles just to satisfy local tooling.
- Do not wrap each function body and function call in `try`/`catch` blocks. It pollutes the code.
  Assume we will always have an e.g.
  `main().catch((err) => { console.error(err); process.exit(1) })` to catch us. I repeat: Avoid
  over-use of try-catch such as
  `try { // foo } catch (err) { console.error('error while foo'); throw err }`, assume we catch
  errors on a higher level and do not need the extra explananation.
- If you must use try/catch, for simple cases, favor `alphalib/tryCatch.ts`
  (`const [err, data] = await tryCatch(promise)`) over
  `let data; try { data = await promise } catch (err) { }`
- Before creating new files and new code, see if we can leverage existing work, maybe slighty adapt
  that without breaking BC, to keep things DRY.
- Favor early exits, so quickly `continue`, `return false` (or `throw` if needed), over nesting
  everything in positive conditions, creating christmas trees.
- Use Prettier with 100 char line width, single quotes for JS/TS, semi: false
- Use descriptive names: PascalCase for components/types, camelCase for variables/methods/schemas
- Alphabetize imports, group by source type (built-in/external/internal)
- Preserve existing sorted lists and config ordering unless intentionally changing the order.
- Favor US English over UK English, so `summarizeError` over `summarise Error`
- Favor `.replaceAll('a', 'b)` over `.replace(/a/g, 'b')` or `.replace(new RegExp('a', 'g'), 'b')` when the only need for regeses was replacing all strings. That's usually both easier to read and more performant.
- Use typographic characters: ellipsis (`…`) instead of `...`, curly quotes (`'` `"`) instead of straight quotes in user-facing text
- Generated text files should end with a trailing newline. Do not trim serializer output when the
  serializer intentionally emits POSIX-style text.
- Comments should explain why code exists or why an exception is needed, not narrate what the next
  line already says.
- Do not put TODOs, internal implementation notes, or future-work placeholders in user-facing text
  or schema descriptions. Put those in code comments, issues, or docs for maintainers instead.
- Put API keys and secrets in `.env` files, not hardcoded in components
- Do not return raw errors, stack traces, third-party responses, payment objects, database errors, or
  credential data to clients. Show sanitized user-facing messages and log only redacted diagnostic
  details server-side.
- When wrapping or rethrowing an error, preserve the original value with `new Error(message, {
  cause: error })` when possible instead of stringifying it away.
- Remove temporary debug logging/instrumentation before merge. Keep new logs only when they are
  intentional, useful in production, and do not expose sensitive data.
- Check for existing hooks before creating new ones (e.g., `useUppy()` for Uppy functionality)

## general

General:

- Do not touch `.env` files!
- Favor Yarn (4) over npm
- Never run any dev server yourself. I have one running that auto-reloads on changes.
- Avoid blocking the conversation with terminal commands. For example: A) most of my git commands run through pagers, so pipe their output to `cat` to avoid blocking the
  terminal. B) You can use `tail` for logs, but be smart and use `-n` instead of `-f`, or the conversation will block
- Use the `gh` tool to interact with GitHub (search/view an Issue, create a PR).
- When using `fetch()` directly, check `response.ok` before parsing the body, and surface non-2xx
  responses as errors with enough context for debugging.
- Treat `AGENTS.md` and `CLAUDE.md` as generated artifacts (single source of truth is `.ai/rules/`), managed by `~/code/content/_scripts/alphalib-sync.ts`; never edit those files directly. If you'd like to make a modification, do it here in `.ai/rules/` and the script will ensure proper preservation and syncing. If you need a rule specific to this repo, add it to `.ai/rules/repo.mdc`.
- All new files are to be in TypeScript. Even if someone suggests: make this new foo3 feature, model it after `foo1.js`, create: `foo3.ts`. Chances are, a `foo2.ts` already exist that you can take a look at also for inspiration.

## playwright

- Prefer user-centric locators: `getByRole`/`getByText` with accessible names; avoid `page.locator('body')`, `innerText()`, or raw CSS unless there is no accessible alternative.
- Make positive assertions on expected UI/text instead of looping over regexes to assert absence.
- Keep tests simple: no control-flow loops or extra variables for straightforward assertions.
- Navigate with relative URLs (`page.goto('/path')`) by setting `baseURL` in `playwright.config.ts`; avoid stringing environment URLs in tests.
- Stub or mock external/third‑party requests (Intercom, Sentry, etc.) and any auth/login endpoints to keep tests deterministic; return minimal valid JSON when the app expects data.
- Each unexpected error should surface and fail the test.

## typescript

For Typescript:

- Favor `contentGapItemSchema = z.object()` over `ContentGapItemSchema = z.object()`
- Favor `from './PosterboyCommand.ts'` over `from './PosterboyCommand'`
- Favor `return ideas.filter(isPresent)` over `ideas.filter((idea): idea is Idea => idea !== null)`
- Favor using `.tsx` over `.jsx` file extensions.
- Use Node v24's native typestripping vs `tsx` or `ts-node`. These days you do not even need to pass
  `--experimental-strip-types`, `node app.ts` will just work.
- In ESM TypeScript, use `import.meta.dirname` / `import.meta.filename` or `URL` objects instead of
  rebuilding `__dirname` with `fileURLToPath(import.meta.url)` unless compatibility requires it.
- Use `satisfies` when you need literal preservation or structural conformance while keeping the
  expression's inferred type. If the variable should simply have a declared type, use a type
  annotation instead.
- Avoid redundant type annotations inside expressions when TypeScript already infers the exact type,
  especially callback parameters. Keep explicit return types and public boundary annotations.
- Avoid `as`, consider it a sin. If a cast is unavoidable, keep it as narrow as possible and explain
  the upstream type mismatch or runtime invariant.
- For DOM queries and browser APIs, prefer runtime narrowing such as
  `element instanceof HTMLAnchorElement` over type casts. Decide explicitly whether a missing element
  should throw, return early, or no-op.
- Browser/client code must not use Node-only globals or APIs such as `Buffer`. Use browser platform
  APIs such as `btoa`, `TextEncoder`, `Blob`, or `URL`, or isolate the logic in server-only code.
- When browser APIs are missing TypeScript declarations, augment the global interface in
  `_types/global.ts` (or the relevant shared global types file) and narrow with checks such as
  `typeof navigator.setAppBadge === 'function'` instead of casting `navigator` locally.
- Prefer typed DOM properties such as `element.inert = true` and `element.tabIndex = -1` when the
  platform exposes them. Use `setAttribute()` only when you intentionally need raw attribute
  semantics.
- Favor `unknown` over `any`, consider `any` a sin
- Avoid `as unknown as ...` and `biome-ignore lint/suspicious/noExplicitAny`. If an upstream library
  type forces either, isolate it in a tiny adapter/helper with a comment naming the bad upstream
  type.
- Every `@ts-expect-error` must be narrow and include a short explanation of the upstream type gap or
  invariant that makes it safe.
- Favor validating data with Zod over using `any` or custom type guards
- Extract duplicated Zod object shapes, regexes, and descriptions into reusable schema fragments
  when they describe the same domain concept. Keep property-level concerns such as `.optional()` and
  `.default()` at the property site unless absence is intrinsic to the reusable fragment.
- Boolean Zod properties should usually use explicit defaults instead of `.optional()` when omission
  has normal default behavior. Only leave a boolean optional when `undefined` is semantically
  different from `false`.
- Prefer `z.union([...])` over chained `.or()` for multi-branch unions, and prefer `z.enum()` or
  literal unions over clever regexes when the accepted values are finite and autocomplete matters.
- Do not duplicate supported values in user-facing schema descriptions when schema metadata such as
  enums or suggested values can carry that information.
- In TypeScript files, use TypeScript syntax instead of JSDoc type annotations. In JavaScript files,
  prefer JSDoc `@import` / `@param` forms over noisy inline `import('...')` annotations, and make
  sure `@type` annotates the expression it is meant to type.
- Avoid hand-written `.d.ts` files when the declaration can come from TypeScript source or
  generation. If a declaration file is unavoidable, do not rely on `skipLibCheck` to hide duplicate
  or invalid exports.
- Avoid `Reflect.get` for normal object property reads. After narrowing to a record, use
  `record[key]` or a small typed reader helper. Only keep `Reflect.get` for exotic receivers such as
  proxies or framework objects where its semantics are intentionally required, and document why.
- Prefer `Number.isFinite()` / `Number.isNaN()` over global `isFinite()` / `isNaN()` so numeric
  checks do not silently coerce non-numbers.
- `isRecord` style guards must reject arrays:
  `typeof value === 'object' && value !== null && !Array.isArray(value)`. Prefer importing a shared
  guard when one already exists in the relevant shared layer.
- Type-only refactors must preserve runtime behavior. If the behavior intentionally changes, call it
  out in the PR and cover the changed behavior with tests.
- Use ECMAScript `#private` fields for private state. Do not rely on underscore names or TypeScript
  `private` to imply runtime privacy.
- Prefer Zod defaults/preprocessing for schema-backed default values instead of duplicating default
  objects in runtime code.
- For local TypeScript files, import with the `.ts` / `.tsx` extension (not `.js`, not
  extensionless). Note: we do not currently enable the TS 5.7 `rewriteRelativeImportExtensions`
  compiler option, because it errors on non-relative imports that include `.ts`/`.tsx` (for example
  via `paths` aliases like `@/…`). If/when we enable it, we will need to adjust those imports first.
- Favor defining props as an interface over inline
- Favor explicit return types over inferring them as it makes typescript a lot faster in the editor
  on our scale
