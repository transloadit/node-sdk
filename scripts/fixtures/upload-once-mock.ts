import { createHash } from 'node:crypto'
import { appendFile, readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

// Used only by the packed-example smoke test. No production credentials or API calls.
const packagePath = process.env.TRANSLOADIT_INIT_FIXTURE_PACKAGE
const tracePath = process.env.TRANSLOADIT_INIT_FIXTURE_TRACE
if (!packagePath || !tracePath) throw new Error('Missing packed-example fixture paths')
const { Transloadit } = await import(pathToFileURL(packagePath).href)
globalThis.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : input)
  if (
    url.origin !== 'https://init-fixture.tlcdn.com' ||
    !decodeURIComponent(url.pathname).includes('builtin/storage-preview@0.0.3') ||
    url.searchParams.get('f') !== 'webp' ||
    !url.searchParams.has('sig') ||
    options?.redirect !== 'error' ||
    !(options.signal instanceof AbortSignal)
  )
    throw new Error('Unexpected network request in the example fixture')
  await appendFile(tracePath, 'delivery\n')
  if (process.env.TRANSLOADIT_INIT_FIXTURE_FAIL_DELIVERY === 'true') {
    return Response.json(
      { error: 'GET_ACCOUNT_UNKNOWN_AUTH_KEY', reason: 'fixture-signed-secret' },
      { status: 400 },
    )
  }
  return new Response('mocked image bytes', { headers: { 'content-type': 'image/webp' } })
}
Transloadit.prototype._remoteJson = () => {
  throw new Error('Unexpected SDK request in the example fixture')
}
Transloadit.prototype.listStoredAssets = async () => ({
  ok: 'DAM_ASSETS_LISTED',
  message: 'Assets listed',
  workspace: 'init-fixture',
  assets: [],
  next_cursor: null,
})
Transloadit.prototype.listPublicStoragePrefixes = async () => ({
  ok: 'STORAGE_PUBLIC_PREFIXES_LISTED',
  public_prefixes: [],
})
Transloadit.prototype.storeImage = async (file: string, options: { path: string }) => {
  if (process.env.TRANSLOADIT_INIT_FIXTURE_FAIL_UPLOAD === 'true') {
    // Exercise the real storage command's stderr, not only the demo's top-level catch.
    throw new Error('Invalid response at https://example.test/?signature=fixture-signed-secret')
  }
  const bytes = await readFile(file)
  await appendFile(tracePath, 'upload\n')
  return {
    workspace: 'init-fixture',
    asset_id: 'A'.repeat(22),
    version_id: `${'B'.repeat(21)}A`,
    path: options.path,
    size: bytes.length,
    md5hash: createHash('md5').update(bytes).digest('hex'),
    mime: 'image/jpeg',
    width: 800,
    height: 600,
  }
}
