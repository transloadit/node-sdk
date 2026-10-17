# Upload once, transform forever

Store one original and display three sizes, crops and formats through the Smart CDN. No custom
Template, framework, AWS CLI or copied API secrets are required. You need Node.js 24.15+ (or 26+)
and a [Storage-enabled workspace](https://transloadit.com/support/).

```bash
npx @transloadit/node@latest init upload-once my-gallery
cd my-gallery
npm run demo
```

The initializer creates a **new** directory and installs compatible dependencies. It does not
upload, publish a directory or change existing project files. Use `--no-install` to install later.

The demo uses configured CLI credentials or opens browser login when none are configured, checks Storage policy access,
and uploads the bundled photo through `storage store --hashed`. Open `gallery.html` to see the
three variants. The policy check is not a guarantee that an upload will succeed.
Normal device login creates a combined upload/Smart CDN CLI key; finish the printed approval
code in your browser, or use `npm exec -- transloadit auth login --no-browser` over SSH/headless.

Change `variants` near the top of `demo.ts` and rerun `npm run demo`: the CLI's catalog and checksum
checks reuse the matching original. To try your own photo:

```bash
npm run demo -- ./your-photo.jpg
```

If browser authorization did not finish, run `npm exec -- transloadit auth login` in the example
directory. For other failures, the demo names the failed step without exposing transport errors
that could contain signed URLs; check your photo, Storage access and saved catalog before retrying.
Before writing the gallery, one bounded GET checks the first variant’s HTTP status and image
content type. A rejected request stops the demo with a safe status and, when recognized, error
code. `GET_ACCOUNT_UNKNOWN_AUTH_KEY` means the selected key is not enabled for Smart CDN;
check the credential source printed by the demo (shell/project credentials take precedence over
saved login). The other variants load in your browser and show recovery text if they fail.

The CLI saves the full asset/version receipt in `transloadit.images.json`. Keep this local-only,
gitignored catalog: deleting it or cloning the project elsewhere loses the local proof used to skip
uploads. It is intentionally not a shared app database. An occupied remote path is never silently
overwritten; recover its catalog before retrying after an uncertain upload result.
The CLI also generates `transloadit-images.d.ts` for optional Viewer integration. This demo does
not import it or require Viewer: keep it gitignored alongside the catalog, and include those types
only in a project using `@transloadit/viewer/next`.

`auth smart-cdn` uses the SDK's signer and `builtin/storage-preview@0.0.3`; the example contains no
custom signer or processing pipeline. `v` is the returned Storage version ID, not a cachebuster.
The first request for a variant renders it; later requests can use the cached output. The HTML
contains one-to-two-hour signed access URLs, not keys. Regenerate it when they expire and keep it
private. Nothing is published by this example, but an already-public destination stays public.

## From a local demo to an application

The normal CLI credential precedence still applies: shell, project `.env`, then saved login.
Storage commands report which source they use and reject a different catalog workspace.
Browser login creates a CLI key; `auth logout` revokes it. **Do not deploy that key.** Provision
separate application upload credentials and a signing-only `smart_cdn:sign` delivery key. Check
your application's authorization before signing, and never accept arbitrary asset IDs to sign.

- [Node SDK: store an image](https://github.com/transloadit/node-sdk/tree/main/packages/node#store-an-image)
  for server-side uploads instead of CLI seeding.
- [React/Next.js images and Viewer](https://github.com/transloadit/node-sdk/tree/main/packages/img)
  for responsive rendering, loading states and galleries. Existing Next.js apps can use
  `transloadit image init website/ --example`; this standalone example does not modify your app.
- [Convex wedding gallery](https://github.com/transloadit/convex#example-app-nextjs--uppy-wedding-gallery)
  for user uploads, live receipt queries and authorized photo/video delivery. Guest access,
  webhook ownership, invitation rules and retention remain application responsibilities.

This directory is the canonical example shipped in `@transloadit/node`. The CLI copies these
files, and CI executes them. The blog and integration guides link here instead of maintaining
their own upload or rendering scripts. The bundled photo reuses the SDK's existing fixture.
