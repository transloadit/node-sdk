import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { execa } from 'execa'
import { z } from 'zod'

// Edit these, then rerun npm run demo. Matching originals are not uploaded again.
const variants = [
  { label: 'WebP card', w: 640, h: 480, f: 'webp', r: 'pad' },
  { label: 'Square AVIF image', w: 480, h: 480, f: 'avif', r: 'pad' },
  { label: 'Wide JPEG crop', w: 320, h: 180, f: 'jpg', r: 'fillcrop' },
]

const cliPath = fileURLToPath(
  new URL('./dist/cli.js', import.meta.resolve('@transloadit/node/package.json')),
)
const cli = execa({ reject: false, timeout: 300_000 })
let stage = 'checking CLI credentials; check your shell, project .env and saved login'

async function command(args: string[], input?: string): Promise<string> {
  stage = `running ${args[0]} ${args[1]}`
  // Capture both streams: transport failures can contain signed request URLs, even on stderr.
  const result = await cli(process.execPath, [cliPath, ...args], { input })
  if (result.failed) throw new Error('CLI command failed')
  return result.stdout.trim()
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

async function checkDelivery(url: string): Promise<void> {
  stage = 'checking Smart CDN delivery; check your connection and rerun npm run demo'
  // One bounded GET checks delivery, not just signing. The browser loads the other variants.
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' })
  if (!response.ok) {
    stage = `checking Smart CDN delivery (HTTP ${response.status}); rerun npm run demo and check your credential source and Storage access`
    // Only a known code is safe to print. Never relay upstream reasons, URLs or other body fields.
    const failure = z
      .object({ error: z.literal('GET_ACCOUNT_UNKNOWN_AUTH_KEY') })
      .safeParse(await response.json().catch(() => null))
    if (failure.success) {
      stage = `checking Smart CDN delivery (HTTP ${response.status}, ${failure.data.error}); check the credential source shown above: this key is not enabled for Smart CDN. Normal CLI device login creates a Smart-CDN-enabled combined key; run npm exec -- transloadit auth login if needed, then rerun npm run demo`
    }
    throw new Error('Smart CDN rejected delivery')
  }
  await response.body?.cancel()
  if (!response.headers.get('content-type')?.startsWith('image/')) {
    stage = `checking Smart CDN delivery (HTTP ${response.status}, expected an image); rerun npm run demo and check Storage access`
    throw new Error('Smart CDN did not return an image')
  }
}

async function main(): Promise<void> {
  // The CLI owns login, credential precedence and workspace verification. Never copy its key
  // into an application or expose it in generated HTML. Logout revokes browser-login keys.
  const status = await cli(process.execPath, [cliPath, 'auth', 'status', '--effective', '--json'])
  if (status.failed) throw new Error('Credential configuration failed')
  const config = z
    .object({ configured: z.boolean(), source: z.string().nullable().optional() })
    .parse(JSON.parse(status.stdout))
  if (!config.configured) {
    stage = 'logging in; run npm exec -- transloadit auth login to complete browser authorization'
    // Device authorization enforces its own deadline; do not cut off a browser signup early.
    const login = await cli(process.execPath, [cliPath, 'auth', 'login'], {
      stdio: 'inherit',
      timeout: 0,
    })
    if (login.failed) throw new Error('Login did not finish')
  } else {
    console.log(`Using CLI credentials from ${config.source ?? 'the configured source'}.`)
  }

  console.log('Checking Storage access…')
  await command(['storage', 'publications', '--json'])
  console.log('Storing the original, or reusing its saved receipt…')
  const output = await command([
    'storage',
    'store',
    '--hashed',
    '--json',
    '--',
    process.argv[2] ?? './photo.jpg',
    'upload-once/',
  ])
  // These are the fields this example needs, not a replacement for the SDK's receipt validation.
  const image = z
    .object({
      workspace: z.string().min(1),
      asset_id: z.string().min(1),
      version_id: z.string().min(1),
      path: z.string().min(1),
      uploaded: z.boolean(),
    })
    .parse(JSON.parse(output))
  console.log(
    image.uploaded
      ? `Uploaded ${JSON.stringify(image.path)}.`
      : `Reused ${JSON.stringify(image.path)}; no upload needed.`,
  )
  const HOUR = 60 * 60 * 1000
  const expiresAt = (Math.floor(Date.now() / HOUR) + 2) * HOUR
  const figures = []
  for (const { label, w, h, f, r } of variants) {
    const url = await command(
      ['auth', 'smart-cdn'],
      JSON.stringify({
        workspace: image.workspace,
        template: 'builtin/storage-preview@0.0.3',
        input: image.asset_id,
        expire_at_ms: expiresAt,
        url_params: { v: image.version_id, w, h, f, r, q: 75 },
      }),
    )
    if (figures.length === 0) {
      console.log('Checking Smart CDN delivery…')
      await checkDelivery(url)
    }
    figures.push(
      `<figure><img src="${escapeHtml(url)}" width="${w}" height="${h}" alt="${escapeHtml(label)}" onerror="this.hidden = true; this.nextElementSibling.hidden = false"><p role="status" hidden>This variant could not load. Its temporary access may have expired. Rerun npm run demo, reopen gallery.html, and check the terminal for Smart CDN delivery errors if it still fails.</p><figcaption>${escapeHtml(label)}</figcaption></figure>`,
    )
  }
  stage = 'writing gallery.html; check that the current directory is writable'
  await writeFile(
    'gallery.html',
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>One original, three variants</title>
<style>
:root { color-scheme: light dark; }
body { font: 1rem system-ui; max-width: 80rem; margin: 2rem auto; padding: 0 1rem; }
main { display: flex; flex-wrap: wrap; align-items: start; gap: 1rem; }
figure { margin: 0; max-width: 30rem; }
img { display: block; max-width: 100%; height: auto; }
img[hidden] { display: none; }
</style>
</head>
<body><h1>One original, three variants</h1><main>${figures.join('\n')}</main></body>
</html>
`,
    { mode: 0o600 },
  )
  console.log(
    'Open gallery.html in your browser. It contains temporary access URLs; keep it private.\nChange variants in demo.ts and rerun npm run demo, or try npm run demo -- ./your-photo.jpg.',
  )
}

await main().catch(() => {
  // Subprocess errors may contain signed URLs; never print the error object or its stdout.
  console.error(
    `Demo stopped while ${stage}. Check Storage access, your local photo and transloadit.images.json before retrying; an upload may already have succeeded. Raw transport errors are withheld because they can contain signed URLs.`,
  )
  process.exitCode = 1
})
