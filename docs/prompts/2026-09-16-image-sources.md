# Image source model experiment

September 16, 2026. Recommendation, not a released API. The prototype lives only in the packed
Next.js fixture in [node-sdk #500](https://github.com/transloadit/node-sdk/pull/500). Production
exports, package names, Storage behavior and dependencies are unchanged.

## Outcome

Keep one image renderer, with **Transloadit Storage as the integrated source and named sources for
customers who already have HTTP assets or S3 objects**. Do not require those customers to move their
originals into Storage. A source binds delivery policy and metadata as well as a processing template.

The earlier `StorageImage` name describes the current adapter, not a Smart CDN limitation. Both
importers work behind the existing renderer when their templates implement its rendition contract.

Proposed public shape, using the separately agreed Viewer package name:

```tsx
import { Image } from '@transloadit/viewer/next'

<Image storage src="website/hero.jpg" alt="A canal house" width={960} preload />
<Image source="website" src="website/hero.jpg" alt="A canal house" width={960} />
<Image source="products" src="products/chair.jpg" alt="An oak chair" width={480} />
```

`storage` is shorthand for the integrated Storage source. `source` selects a trusted, configured
source, not an arbitrary URL or Robot. They are mutually exclusive. Bare `<Image src="…" />` should
only be accepted when a default source is established; this experiment deliberately has no default.
Do not introduce both `storage` and `source="storage"` spellings merely for symmetry.

The import above is illustrative. The runnable prototype imports `Image` from its fixture-local
module; it does not add `@transloadit/viewer` or an `Image` export to the current package.

## What was compared

| Shape | Experiment | Assessment |
| --- | --- | --- |
| `Image storage` / `Image source="products"` | Typed and rendered in both browser engines | Preferred: JSX describes the asset collection, while configuration owns its implementation. |
| `Image storage` / `Image template="fixture-http"` | Typed and rendered alongside the first shape | Works, but puts processing-template identity into JSX without describing metadata, workspace or access policy. |
| One factory-bound component per source | Existing factories underpin both prototypes | Useful low-level escape hatch. Applications can use a local `ProductImage` without a mandatory registry. |

For the same HTTP source, the template-selector and source-selector variants emitted the same
delivery URL. Neither syntax has an inherent bandwidth advantage. Source names are preferable for
maintenance and policy clarity, not speed: switching templates or buckets need not change JSX.

The prototype intentionally exposes only a constrained-layout subset (`alt`, `width`, `preload`).
It is not a finished general-purpose component API or evidence that every existing prop composes
with multiple sources.

## The important live finding: a template ID is not a compatibility contract

On the already-running owned API2 devdock, all four requests asked for `f=webp`:

| Source/template | HTTP status | Actual response |
| --- | --- | --- |
| Existing S3 `previews` | 200 | JPEG: the template did not map the requested format. |
| Existing HTTP `url-preview` | 200 | PNG: the template hardcoded PNG. |
| Temporary compatible S3 template | 200 | WebP. |
| Temporary compatible HTTP template | 200 | WebP. |

The follow-up probe checked the body signatures as well as `Content-Type`. Merely getting a 200
image response is insufficient: declaring WebP in `<source type>` while serving PNG is a broken
integration contract. Incorrect geometry, cropping or alpha behavior can be similarly silent.

The temporary templates used `/s3/import` or an origin-pinned `/http/import`, then `/image/resize`
and `/file/serve`. They mapped the existing image component's fields:

- `input`: validated relative source path, resolved against the configured bucket/origin.
- `w`, `h`: requested dimensions.
- `f`, `q`: output format and quality.
- `r`, `bg`: resize strategy and background/alpha behavior.

Both required signatures and disabled step overrides. HTTP pinned `https://transloadit.com/` and
capped input size at 16 MiB. S3 reused the devdock's existing fixture credential reference. Temporary
templates were deleted after each probe; existing templates and credentials were not modified.

These probes prove HTTP/S3 import execution and requested WebP output. They do **not** certify the
full crop, orientation, alpha, animation, authorization or cache contract. Those remain adapter
acceptance tests before productizing it. The live HTTP and S3 originals were different images, so
their sizes and request durations are not a comparative performance benchmark.

## Customer model

Put these concerns in a small server-side source binding, reusing the current factory and URL
builder rather than creating a new plugin framework:

- Workspace and compatible transformation template, including version and field mapping.
- Relative-path restrictions and the trusted HTTP origin or S3 bucket/prefix. Credentials stay in
  Transloadit template credentials; never put bucket secrets in JSX or browser code.
- Metadata: an optional static catalog, or trusted image metadata from an existing CMS/database.
- Publication/access policy and signing/delivery configuration.

A template override belongs here. Do not infer behavior from template names or permit arbitrary
caller-selected templates. Provide a canonical compatible recipe and a setup-time delivery probe
that checks format and geometry, with actionable errors. Avoid metadata/network discovery during
each image render.

Storage keeps its strongest advantages: upload receipts, generated path types, conventional setup,
public-prefix enforcement and first-party defaults. External sources should not require a fake
Storage receipt or an upload. The existing image-source structure already needs only `path`,
`width` and `height`; optional checksum/blur metadata must retain truthful provenance. Passing
trusted CMS metadata is a proposed supported path, not a new live CMS integration tested here.

Static catalogs can give each source its own typed paths. Do not force a large or user-generated
asset collection into one repository-wide manifest and literal union. Runtime path and access
checks remain necessary even when TypeScript accepts a source/path pair. The experiment's five
negative type cases protect the proposed selector boundary, not an authorization boundary.

Keep relative `src` paths for configured external origins, so moving a bucket or CDN host does not
require editing content. Full remote URLs could be a deliberate later capability with origin and
redirect/SSRF controls; they must not quietly enable an unrestricted transformation/billing proxy.

### Where the friction actually was

1. **Silent template incompatibility:** the legacy templates returned successful images in the
   wrong requested format. This deserves a setup check, not a troubleshooting footnote.
2. **Storage-shaped setup:** the conventional Next plugin currently requires one Storage catalog.
   The experiment needed explicit factories for the external sources. A rename alone does not
   make the external-source onboarding work.
3. **Global workspace precedence:** code inspection found that `TRANSLOADIT_WORKSPACE` overrides
   an explicit factory workspace. All three experimental sources used one workspace; mixed
   workspaces are not proven and need an explicit per-source precedence contract and tests.
4. **Delivery mode affects rendering:** signed direct sources made the page dynamic. Keep that
   choice explicit without making every customer understand capabilities on the first image.
5. **Storage-specific diagnostics:** existing factory errors and development notes still say
   Storage. An HTTP customer should receive source/template-specific guidance, not an instruction
   to upload the asset to Storage.

The syntax wrappers were small. Template compatibility and these configuration boundaries are
where the product work is, not in replacing the component's exported name.

## Delivery and caching are separate choices

The native browser proof delivered Storage through an unsigned public Built-in and HTTP/S3 through
signed direct URLs. All image bodies went to the delivery origin, never through Next's optimizer
or a Next image-byte proxy. The adapter adds no Client Component or dependency.

Direct private signing uses request-time work: Next marked the experiment route dynamic, and its
development diagnostic explained this. A named source does not make a signed page statically
cacheable. Preserve the existing redirect option for private authorization; it adds a per-image
authorization/signing request, not an image-byte proxy. Public delivery can use stable direct URLs
only where the backend actually enforces the intended publication and transformation policy.

Storage public prefixes do not automatically publish or constrain S3/HTTP imports. Start custom
sources signed. A public custom source needs an independently verified policy: origin/bucket/path
restrictions, bounded transformations and costs, plus the relevant import redirect/SSRF controls.
Do not reintroduce the removed arbitrary-origin Built-in as a convenience default.

Mutable external objects need an explicit version/cache invalidation strategy. Do not label an
unverified `v` tag or arbitrary S3 ETag as a byte checksum. Production Bunny cache behavior was
not measured in this experiment.

## Evidence and reproduction

Source baselines: node-sdk `80b20c8433f00573f9fd9d83330011fe898fb8cd`, API2
`5c9d4a538f9e891b32dd223a1cb35fde6e5fb279`, Content `48cf9235f2`. Host Node was 26.7.0;
the packed app used Next.js 16.3.4. No claim of a fresh Node 24 or production deployment test.

From node-sdk, after its normal locked dependency installation:

```bash
corepack yarn workspace @transloadit/img check
corepack yarn verify
corepack yarn test:img:fixture
```

- Image baseline: 320 tests, build and type checks passed.
- Selector type proof: valid Storage/HTTP/S3/template cases; compile-time rejection of wrong-source
  paths, simultaneous selectors, missing source, unknown template and full remote URL input.
- Red-first browser run: the new test failed in Chromium and WebKit because the local delivery
  fake did not recognize the configured source templates; the other 56 tests passed.
- Green packed browser run: 58 tests with `cacheComponents` enabled, 58 with it omitted, and 10
  development tests. Each production run included the new source test in both engines. The new
  route checked native decode, 320px geometry, correct source/template paths, expected signatures,
  no selector props leaking to DOM attributes, and direct delivery-origin requests.
- Independent browser-tool inspection by the same implementer: desktop and 390px mobile native
  decode, no horizontal overflow, no browser errors. This was **not** an independent blind-reader
  customer study or a timed onboarding comparison.
- `yarn verify` passed, including 320 image and 636 Node tests (one Node test skipped). An existing
  unused-variable warning and existing dependency/runtime warnings remain; they were not hidden.

The fixture serves identical generated image bytes through three simulated sources. The live API2
probes separately exercised actual HTTP and S3 importers. We did not repeat the earlier live
Transloadit Storage upload canary, nor run a single browser page against all three live backends.

The prototype lives in `scripts/fixtures/img-next/app/source-model/`, with assertions in
`scripts/fixtures/img-next/browser.spec.ts`. A fixture-only TypeScript import mismatch was fixed
by placing its type proof alongside the consumer app, using the existing stock-Next import rules;
no consumer TypeScript options or package exports were changed.

Local evidence (not committed artifacts or durable CI links):

- `/tmp/img-source-model-red.log`, `/tmp/img-source-fixture-red.log`
- `/tmp/img-source-model-types2.log`, `/tmp/img-source-verify2.log`
- `/tmp/img-source-fixture-green2.log`, `/tmp/img-source-fixture-final.log`
- `/tmp/img-source-live-format.log`, `/tmp/img-source-live-cleanup.log`
- `test-results/source-model/desktop.png`, `test-results/source-model/mobile.png`

The browser session and its two owned manual servers were stopped. The pre-existing API2 devdock
was reused, not bootstrapped, restarted or stopped. No `.env` files or production settings changed.

## Next bounded slice, if this direction is accepted

1. **node-sdk:** extract neutral image/source names from the current Storage adapter while retaining
   one renderer. Add typed source bindings and keep the Storage convention easy. Prove an external
   source with trusted CMS metadata, without a static catalog. Cover source-specific diagnostics
   and workspace/credential isolation. Rename the unpublished package and internal consumers
   together; do not publish this fixture API as-is.
2. **Content:** bind the existing website image origin/template as a real HTTP source and dogfood
   it next to Storage. Its current template uses `fit` and a subset of fields, so validate/adapt
   its rendition contract before claiming full component compatibility. Preserve visual geometry,
   alpha, responsive downloads, page-load budgets and its signing policy.
3. **API2:** add importer-specific end-to-end acceptance coverage for the rendition contract. A
   signed customer-template path already works; no new arbitrary-origin Built-in is necessary.
   Any anonymous external-source profile is a separate bounded backend/security decision.
4. **Release/Uppy/docs:** update SDK exports, packaging, fixtures and Content's vendored dependency
   together before npm publication. Uppy needs no change for this image-source experiment. Expand
   shared preview consumers and public recipes only against the proven released contract.

No Terraform/CDN change is required by the selector experiment. Identify and review any actual
production delivery-policy change separately. Update the cross-repo
[Viewer plan](https://github.com/transloadit/content/blob/cli-auth-and-combined-keys/repodocs/transloadit-viewer.md)
when accepting the broader source direction; this report refines its Storage-only assumption,
without turning the current task into implementation of every planned renderer.
