import type { StorageAssetReceipt } from '@transloadit/viewer/react'

import { parseSmartCdnUrl } from '@transloadit/utils'
import { getStorageAssetHref, Image } from '@transloadit/viewer/react'
import { createStorageRoute } from '@transloadit/viewer/server'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'

const receipt = {
  workspace: 'album',
  asset_id: 'A'.repeat(22),
  version_id: `${'B'.repeat(21)}A`,
  path: 'photos/Canal house.jpg',
  size: 1000,
  mime: 'image/jpeg',
  width: 1001,
  height: 773,
}
const credentials = { workspace: 'album', authKey: 'test-key', authSecret: 'test-secret' }
const origin = 'https://app.example'

function preview(src = receipt, props = {}): string {
  const html = renderToStaticMarkup(<Image src={src} alt="Canal house" {...props} />)
  const url = /<img[^>]* src="([^"]+)"/.exec(html)?.[1]
  if (url === undefined) throw new Error('Image did not render a fallback')
  return url.replaceAll('&amp;', '&')
}

function request(url = preview(), method = 'GET', cookie = 'session=allowed'): Request {
  return new Request(new URL(url, origin), { method, headers: { cookie } })
}

function mutate(params: Record<string, string | undefined>, url = preview()): string {
  const changed = new URL(url, origin)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) changed.searchParams.set(key, value)
  }
  return changed.href
}

function route(asset: StorageAssetReceipt | null = receipt) {
  const authorizeAsset = vi.fn(({ request: req }: { request: Request }) =>
    req.headers.get('cookie') === 'session=allowed' ? asset : null,
  )
  return { ...createStorageRoute({ ...credentials, authorizeAsset }), authorizeAsset }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test.each([
  'GET',
  'HEAD',
])('%s authorizes the exact preview and redirects without storing auth', async (method) => {
  const handler = route()
  const req = request(undefined, method)
  const response = await handler.GET(req)
  expect(response.status).toBe(307)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(response.headers.get('vary')).toBe('Cookie, Authorization')
  expect(await response.text()).toBe('')
  expect(handler.authorizeAsset).toHaveBeenCalledExactlyOnceWith({
    request: req,
    asset_id: receipt.asset_id,
    version_id: receipt.version_id,
    action: 'preview',
  })
  expect(parseSmartCdnUrl(response.headers.get('location') ?? '')).toMatchObject({
    workspace: 'album',
    template: 'builtin/storage-preview@0.0.3',
    input: receipt.asset_id,
    urlParams: {
      v: receipt.version_id,
      w: '1001',
      h: '773',
    },
  })
})

test.each([
  'original',
  'download',
] as const)('GET and HEAD deliver %s for non-image receipts', async (action) => {
  const video = {
    ...receipt,
    width: undefined,
    height: undefined,
    path: 'videos/Film 🎥.mp4',
    mime: 'video/mp4',
  }
  const url = getStorageAssetHref(video, { action, route: '/media' })
  expect(url.startsWith('/media?')).toBe(true)
  const handler = route(video)
  for (const method of ['GET', 'HEAD']) {
    const response = await handler.HEAD(request(url, method))
    expect(response.status).toBe(307)
    expect(parseSmartCdnUrl(response.headers.get('location') ?? '')).toMatchObject({
      template: 'builtin/storage-serve@0.0.3',
      input: receipt.asset_id,
      urlParams: {
        v: receipt.version_id,
        ...(action === 'download' ? { download: 'Film 🎥.mp4' } : {}),
      },
    })
    expect(handler.authorizeAsset).toHaveBeenLastCalledWith(expect.objectContaining({ action }))
  }
})

test.each([
  '',
  'session=wrong',
])('missing/wrong session and null have identical safe denials (%s)', async (cookie) => {
  const denied = await route().GET(request(undefined, 'GET', cookie))
  const absent = await route(null).GET(request())
  expect(denied.status).toBe(404)
  expect(await denied.text()).toBe(await absent.text())
  expect(denied.headers.get('cache-control')).toBe('private, no-store')
  expect(denied.headers.has('location')).toBe(false)
  expect(await (await route(null).HEAD(request(undefined, 'HEAD'))).text()).toBe('')
})

test.each([
  { workspace: 'other' },
  { asset_id: `${'C'.repeat(21)}A` },
  { version_id: `${'D'.repeat(21)}A` },
  { width: 0 },
  { height: 1.2 },
  { width: Number.MAX_SAFE_INTEGER + 1 },
])('validates the authoritative receipt %j', async (overrides) => {
  expect((await route({ ...receipt, ...overrides }).GET(request())).status).toBe(404)
})

test('never trusts client geometry, path, or workspace for delivery', async () => {
  const response = await route().GET(
    request(preview({ ...receipt, path: 'other/file.jpg', workspace: 'other', height: 500 })),
  )
  expect(response.status).toBe(307)
  expect(parseSmartCdnUrl(response.headers.get('location') ?? '').urlParams.h).toBe('773')
  expect((await route().GET(request(preview({ ...receipt, width: 999 })))).status).toBe(404)
})

test.each([
  { w: '99999' },
  { w: '999' },
  { w: '01001' },
  { w: '1e3' },
  { f: 'gif' },
  { q: '1' },
  { h: '1' },
  { bg: '#000000' },
  { path: 'elsewhere' },
  { workspace: 'other' },
  { template: 'custom' },
  { origin: 'https://evil.example' },
  { crop: '1.3' },
  { action: 'other' },
  { asset_id: 'bad' },
  { version_id: 'current' },
  { download: 'attacker.txt' },
])('rejects unknown or disallowed candidates %j', async (parameters) => {
  const response = await route().GET(request(mutate(parameters)))
  expect(response.status).toBe(404)
  expect(await response.text()).toBe('Not found')
  expect(response.headers.has('location')).toBe(false)
})

test.each(['asset_id', 'version_id', 'action', 'w', 'f'])('rejects duplicate %s', async (name) => {
  expect((await route().GET(request(`${preview()}&${name}=x`))).status).toBe(404)
})

test('authorizes every request and lets the app forbid originals', async () => {
  const authorizeAsset = vi.fn(({ action }: { action: string }) =>
    action === 'preview' ? receipt : null,
  )
  const handler = createStorageRoute({ ...credentials, authorizeAsset })
  expect((await handler.GET(request())).status).toBe(307)
  expect(
    (await handler.GET(request(getStorageAssetHref(receipt, { action: 'original' })))).status,
  ).toBe(404)
  expect(authorizeAsset).toHaveBeenCalledTimes(2)
})

test('generates the same rounded tiny and cropped candidates on both sides', async () => {
  const tiny = { ...receipt, width: 7, height: 3 }
  const policy = {
    widths: [320],
    maximumWidth: 640,
    crops: { square: { aspectRatio: 1 } },
    formats: { png: 80 },
  }
  const handler = createStorageRoute({ ...credentials, policy, authorizeAsset: () => tiny })
  const cropped = await handler.GET(request(preview(tiny, { policy, crop: 'square' })))
  expect(cropped.status).toBe(307)
  expect(parseSmartCdnUrl(cropped.headers.get('location') ?? '').urlParams).toMatchObject({
    w: '3',
    h: '3',
    r: 'fillcrop',
  })
  const natural = await handler.GET(request(preview(tiny, { policy })))
  expect(natural.status).toBe(307)
  expect(parseSmartCdnUrl(natural.headers.get('location') ?? '').urlParams).toMatchObject({
    w: '7',
    h: '3',
  })
})

test('caps intrinsic terminal width and appends it to an explicit short ladder', async () => {
  const huge = { ...receipt, width: 12000, height: 6000 }
  const policy = { widths: [320, 640], maximumWidth: 1920 }
  const url = preview(huge, { policy })
  expect(new URL(url, origin).searchParams.get('w')).toBe('1920')
  const handler = createStorageRoute({ ...credentials, policy, authorizeAsset: () => huge })
  expect((await handler.GET(request(url))).status).toBe(307)
  expect((await handler.GET(request(mutate({ w: '2560' }, url)))).status).toBe(404)
})

test('named crops preserve their display aspect ratio', () => {
  const markup = renderToStaticMarkup(
    <Image
      src={receipt}
      alt="Square"
      policy={{ crops: { square: { aspectRatio: 1 } } }}
      crop="square"
    />,
  )
  expect(markup).toContain('width="773"')
  expect(markup).toContain('height="773"')
})

test('default preview parameters keep the existing Built-in CDN cache key grammar', async () => {
  const response = await route().GET(request())
  const url = new URL(response.headers.get('location') ?? '')
  expect([...url.searchParams.keys()].sort()).toEqual(['auth_key', 'exp', 'h', 'sig', 'v', 'w'])
})

test.each([
  'bad\r\nX: yes.jpg',
  'bad\\name.jpg',
  '\ud800.jpg',
  'x'.repeat(256),
])('rejects unsafe trusted download filename %j', async (filename) => {
  const response = await route({ ...receipt, path: `photos/${filename}` }).GET(
    request(getStorageAssetHref(receipt, { action: 'download' })),
  )
  expect(response.status).toBe(404)
})

test('route URLs survive long-open pages and rotate CDN expiry without near-expired grants', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
  const handler = createStorageRoute({
    ...credentials,
    lifetimeMs: 1000,
    authorizeAsset: () => receipt,
  })
  const stableUrl = preview()
  const before = await handler.GET(request(stableUrl))
  vi.advanceTimersByTime(24 * 3600_000 + 999)
  expect(preview()).toBe(stableUrl)
  const after = await handler.GET(request(stableUrl))
  const expiresAt = parseSmartCdnUrl(after.headers.get('location') ?? '').auth?.expiresAt ?? 0
  expect(expiresAt - Date.now()).toBeGreaterThanOrEqual(500)
  expect(expiresAt - Date.now()).toBeLessThanOrEqual(1000)
  expect(after.headers.get('location')).not.toBe(before.headers.get('location'))
})

test.each([
  'preview',
  'original',
  'download',
] as const)('%s grants honor their maximum lifetime and reuse the current rotation', async (action) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
  const handler = createStorageRoute({
    ...credentials,
    lifetimeMs: 1000,
    authorizeAsset: () => receipt,
  })
  const url = action === 'preview' ? preview() : getStorageAssetHref(receipt, { action })
  const before = await handler.GET(request(url))
  const target = before.headers.get('location') ?? ''
  expect(parseSmartCdnUrl(target).auth?.expiresAt).toBe(Date.now() + 1000)
  vi.advanceTimersByTime(499)
  expect((await handler.HEAD(request(url, 'HEAD'))).headers.get('location')).toBe(target)
  vi.advanceTimersByTime(1)
  expect((await handler.GET(request(url))).headers.get('location')).not.toBe(target)
})

test.each([
  '/app.v2/api/media',
  '/~user/api/media',
  '/app%20name/api/media',
  '/café/media',
])('supports a same-origin route path %s', (path) => {
  const href = getStorageAssetHref(receipt, { action: 'download', route: path })
  expect(new URL(href, origin).origin).toBe(origin)
  expect(new URL(href, origin).pathname).toBe(new URL(path, origin).pathname)
  expect(new URL(preview(receipt, { route: path }), origin).pathname).toBe(
    new URL(path, origin).pathname,
  )
})

test.each([
  '',
  '//evil.example/media',
  '/\\evil.example/media',
  '/media?x=1',
  '/media#x',
  '/\n/evil',
])('rejects unsafe route path %j', (path) => {
  expect(() => getStorageAssetHref(receipt, { action: 'download', route: path })).toThrow()
})

test.each([
  { loading: 'eager', sizes: 'auto, 100vw' },
  { priority: false },
] as const)('React renders %j without a process global', (props) => {
  vi.stubGlobal('process', undefined)
  expect(() => preview(receipt, props)).not.toThrow()
})

test('method rejection never calls authorization', async () => {
  const handler = route()
  const response = await handler.GET(request(undefined, 'POST'))
  expect(response.status).toBe(405)
  expect(response.headers.get('allow')).toBe('GET, HEAD')
  expect(handler.authorizeAsset).not.toHaveBeenCalled()
})

test('authorizer errors and boolean returns never disclose private details', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const handler = createStorageRoute({
    ...credentials,
    authorizeAsset() {
      throw new Error('test-secret private receipt')
    },
  })
  const response = await handler.GET(request())
  expect(response.status).toBe(500)
  expect(await response.text()).toBe('Internal server error')
  expect(error).toHaveBeenCalledExactlyOnceWith('[Viewer] Storage authorization failed.')
  const bad = createStorageRoute({
    ...credentials,
    // @ts-expect-error A JS caller must not be able to authorize with a boolean.
    authorizeAsset: () => true,
  })
  expect((await bad.GET(request())).status).toBe(404)
})

test('signing failures report only their stage and keep the response private', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('crypto', undefined)
  const response = await route().GET(request())
  expect(response.status).toBe(500)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(await response.text()).toBe('Internal server error')
  expect(error).toHaveBeenCalledExactlyOnceWith('[Viewer] Storage signing failed.')
})

test.each([
  { lifetimeMs: 0 },
  { workspace: '' },
  { authKey: '' },
  { authSecret: '' },
  { baseUrl: 'javascript:secret' },
  { policy: { widths: [] } },
  { policy: { maximumWidth: 9000 } },
  { policy: { crops: { x: { aspectRatio: 50 } } } },
])('fails invalid configuration without echoing its values %j', (config) => {
  expect(() =>
    createStorageRoute({ ...credentials, authorizeAsset: () => receipt, ...config }),
  ).toThrow()
})

test('drift diagnostics run only after authorization and contain only candidate policy', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const authorizeAsset = vi.fn((): StorageAssetReceipt | null => null)
  const handler = createStorageRoute({ ...credentials, diagnostics: true, authorizeAsset })
  await handler.GET(request(mutate({ w: '999' })))
  expect(warn).not.toHaveBeenCalled()
  authorizeAsset.mockReturnValue(receipt)
  await handler.GET(request(mutate({ w: '999' })))
  expect(warn).toHaveBeenCalledOnce()
  const message = JSON.stringify(warn.mock.calls)
  expect(message).toContain('same policy')
  expect(message).toContain('1001')
  expect(message).not.toContain(receipt.asset_id)
  expect(message).not.toContain(receipt.path)
  expect(message).not.toContain('test-secret')
})
