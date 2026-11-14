import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

import { getSmartCdnUrl, parseSmartCdnUrl } from '@transloadit/utils'
import { getSignedSmartCdnUrl } from '@transloadit/utils/node'
import {
  createTransloaditImageModel,
  transloaditPublicStoragePreviewTemplate,
  transloaditStoragePreviewTemplate,
} from '@transloadit/viewer'
import { createStorageRoute } from '@transloadit/viewer/server'

const receipt = {
  workspace: 'fixture',
  asset_id: 'A'.repeat(22),
  version_id: `${'B'.repeat(21)}A`,
  path: 'website/hero.jpg',
  mime: 'image/jpeg',
  size: 1000,
  width: 1200,
  height: 800,
}
const credentials = { workspace: receipt.workspace, authKey: 'test-key', authSecret: 'test-secret' }
const require = createRequire(import.meta.url)

test('the installed consumer has neither React nor Next.js', async () => {
  for (const name of ['react', 'react-dom', 'next'])
    assert.throws(() => require.resolve(name), { code: 'MODULE_NOT_FOUND' })
  await assert.rejects(import('@transloadit/viewer/react'), { code: 'ERR_MODULE_NOT_FOUND' })
})

test('the root entry builds serializable, version-pinned public responsive sources', () => {
  const model = createTransloaditImageModel(
    {
      src: receipt,
      expiresAt: undefined,
      template: transloaditPublicStoragePreviewTemplate,
      widths: [320, 640, 960],
    },
    ({ input, template, urlParams }) =>
      getSmartCdnUrl({ workspace: receipt.workspace, input, template, urlParams }),
  )
  assert.deepEqual(
    model.sources.map(({ format }) => format),
    ['avif', 'webp'],
  )
  assert.deepEqual(
    model.sources[0]?.candidates.map(({ width }) => width),
    [320, 640, 960],
  )
  const fallback = parseSmartCdnUrl(model.fallbackUrl)
  assert.equal(fallback.template, transloaditPublicStoragePreviewTemplate)
  assert.equal(fallback.input, receipt.asset_id)
  assert.equal(fallback.urlParams.v, receipt.version_id)
  assert.equal(fallback.urlParams.w, '960')
  assert.equal(fallback.urlParams.h, '640')
  assert.equal(fallback.auth, undefined)
  assert.deepEqual(JSON.parse(JSON.stringify(model)).sources, model.sources)
})

test('a server can use the synchronous Node signer without a framework', () => {
  const expiresAt = Date.UTC(2030, 0, 1)
  const model = createTransloaditImageModel(
    { src: receipt, expiresAt, widths: [320, 640] },
    (request) => getSignedSmartCdnUrl({ ...credentials, ...request }),
  )
  const fallback = parseSmartCdnUrl(model.fallbackUrl)
  assert.equal(fallback.template, transloaditStoragePreviewTemplate)
  assert.equal(fallback.input, receipt.asset_id)
  assert.equal(fallback.auth?.expiresAt, expiresAt)
  assert.equal(fallback.auth?.key, credentials.authKey)
  assert.match(fallback.auth?.signature ?? '', /^sha256:[a-f0-9]{64}$/)
})

test('Web handlers authorize each request and redirect without proxying bytes', async () => {
  const route = createStorageRoute({
    ...credentials,
    authorizeAsset: ({ request, asset_id, version_id }) =>
      request.headers.get('Authorization') === 'Bearer fixture-session' &&
      asset_id === receipt.asset_id &&
      version_id === receipt.version_id
        ? receipt
        : null,
  })
  const url = new URL('https://app.example/media')
  url.search = new URLSearchParams({
    asset_id: receipt.asset_id,
    version_id: receipt.version_id,
    action: 'preview',
    w: '640',
    f: 'webp',
  }).toString()
  assert.equal((await route.GET(new Request(url))).status, 404)
  const headers = { Authorization: 'Bearer fixture-session' }
  const allowed = await route.GET(new Request(url, { headers }))
  assert.equal(allowed.status, 307)
  assert.equal(await allowed.text(), '')
  const location = allowed.headers.get('Location')
  assert.ok(location)
  const target = parseSmartCdnUrl(location)
  assert.equal(target.input, receipt.asset_id)
  assert.equal(target.urlParams.v, receipt.version_id)
  assert.equal(target.urlParams.f, 'webp')
  assert.equal(target.auth?.key, credentials.authKey)
  const head = await route.HEAD(new Request(url, { method: 'HEAD', headers }))
  assert.equal(head.status, 307)
  assert.equal(head.body, null)
  assert.equal((await route.GET(new Request(url))).status, 404)
})
