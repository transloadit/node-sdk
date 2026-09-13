// @vitest-environment happy-dom

import { parseSmartCdnUrl } from '@transloadit/utils/node'
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const { connection, builtin } = vi.hoisted(() => ({
  connection: vi.fn(async () => undefined),
  builtin: { template: 'builtin/storage-preview@0.0.2' },
}))

vi.mock('next/server.js', () => ({ connection }))
vi.mock('server-only', () => ({}))
vi.mock('../src/index.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/index.ts')>()),
  get transloaditStoragePreviewTemplate() {
    return builtin.template
  },
}))

import {
  createPrivateStorageImages,
  createStorageImages,
  createTransloaditImage,
} from '../src/next/server.tsx'

const images = {
  'website/hero.jpg': { path: 'website/hero.jpg', width: 2400, height: 1600 },
  'logo.png': { path: 'logo.png', width: 64, height: 64 },
}

function firstUrl(markup: string): URL {
  const document = new DOMParser().parseFromString(markup, 'text/html')
  const src = document.querySelector('img')?.getAttribute('src')
  if (src === null || src === undefined) throw new Error('Expected an image URL')
  return new URL(src, 'https://app.example')
}

function expiry(url: URL): number {
  const expiresAt = parseSmartCdnUrl(url.href).auth?.expiresAt
  if (expiresAt === undefined) throw new Error('Expected a signed expiry')
  return expiresAt
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime('2029-01-01T12:00:00Z')
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'render-key')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', 'render-secret')
  vi.stubEnv('TRANSLOADIT_WORKSPACE', 'my-app')
  builtin.template = 'builtin/storage-preview@0.0.2'
  connection.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

test('public catalog images are static with long-lived direct URLs and no signing shell', () => {
  const { StorageImage } = createStorageImages({ images, public: ['website/'], lifetime: '365d' })
  const markup = renderToStaticMarkup(
    <StorageImage src="website/hero.jpg" alt="Hero" layout="constrained" maxWidth={960} preload />,
  )
  const url = firstUrl(markup)
  expect(url.hostname).toBe('my-app.tlcdn.com')
  expect(expiry(url) - Date.now()).toBeGreaterThan(364 * 86_400_000)
  expect(expiry(url) - Date.now()).toBeLessThanOrEqual(365 * 86_400_000)
  expect(markup).not.toContain('visibility:hidden')
  expect(connection).not.toHaveBeenCalled()
  expect(markup).toContain('max-width:960px')
})

test('declared public images default to a year without a dynamic-delivery warning', () => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { headers: { 'Content-Type': 'image/png' } })),
  )
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
  try {
    const { StorageImage } = createStorageImages({ images, public: ['website/'] })
    const markup = renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />)
    expect(expiry(firstUrl(markup)) - Date.now()).toBeGreaterThan(364 * 86_400_000)
    expect(info).not.toHaveBeenCalled()
  } finally {
    info.mockRestore()
    vi.unstubAllGlobals()
  }
})

test('catalog directories accept DB receipts, but root entries do not authorize the workspace', () => {
  const { StorageImage } = createPrivateStorageImages({ images, authorize: () => true })
  expect(renderToStaticMarkup(<StorageImage src="logo.png" alt="Logo" />)).toContain('width="64"')
  expect(
    renderToStaticMarkup(
      <StorageImage src={{ path: 'website/from-db.jpg', width: 300, height: 200 }} alt="DB" />,
    ),
  ).toContain('width="300"')
  expect(() =>
    StorageImage({ src: { path: 'private.jpg', width: 20, height: 20 }, alt: 'Private' }),
  ).toThrow(/allowed/)
})

test('explicit scope still limits catalog paths and public declarations', () => {
  const { StorageImage } = createStorageImages({ images, allowedPathPrefixes: [] })
  expect(() => StorageImage({ src: 'website/hero.jpg', alt: 'Denied' })).toThrow(/allowed/)
  expect(() => createStorageImages({ images, public: ['private/'] })).toThrow(/public.*allowed/)
})

test('catalog keys must agree with their receipt paths and unknown keys never fall through', () => {
  expect(() =>
    createStorageImages({ images: { 'public.jpg': images['website/hero.jpg'] } }),
  ).toThrow(/catalog.*path/)
  const { StorageImage } = createStorageImages({ images })
  expect(() =>
    Reflect.apply(StorageImage, undefined, [
      { src: 'website/typo.jpg', alt: 'Typo', width: 300, height: 200 },
    ]),
  ).toThrow(/catalog/)
})

test('workspace-root access requires the named acknowledgment, never an empty prefix', () => {
  expect(() => createStorageImages({ allowedPathPrefixes: [''] })).toThrow(/allowWorkspaceRoot/)
  const { StorageImage } = createPrivateStorageImages({
    allowWorkspaceRoot: true,
    authorize: () => true,
  })
  expect(renderToStaticMarkup(<StorageImage src={images['logo.png']} alt="Logo" />)).toContain(
    '<picture>',
  )
})

test.each([
  'constructor',
  'toString',
  '__proto__',
])('requires an own catalog entry for %s without excluding an explicitly stored file', (path) => {
  const missing = createStorageImages({ images })
  expect(() =>
    Reflect.apply(missing.StorageImage, undefined, [{ src: path, alt: 'Missing image' }]),
  ).toThrow('Storage image path is not in the configured catalog')
  const present = createPrivateStorageImages({
    images: { [path]: { path, width: 64, height: 64 } },
    authorize: () => true,
  })
  expect(renderToStaticMarkup(<present.StorageImage src={path} alt="Stored image" />)).toContain(
    'width="64"',
  )
})

test.each([
  30_001, 59_999, 60_000,
])('rejects a rotation interval of %i that leaves less than half the lifetime for delivery', (rotationIntervalMs) => {
  expect(() =>
    createPrivateStorageImages({
      images,
      authorize: () => true,
      lifetime: 60_000,
      rotationIntervalMs,
    }),
  ).toThrow(/rotationIntervalMs.*half/)
  expect(() =>
    createStorageImages({ images, public: ['website/'], lifetime: 60_000, rotationIntervalMs }),
  ).toThrow(/rotationIntervalMs.*half/)
})

test('rotation margin also applies to the private cap in a long-lived public factory', () => {
  expect(() =>
    createPrivateStorageImages({
      images,
      authorize: () => true,
      public: ['website/'],
      lifetime: '365d',
      rotationIntervalMs: 24 * 3_600_000 + 1,
    }),
  ).toThrow(/rotationIntervalMs.*half/)
})

test.each([
  0, 1, 29_999, 30_000, 59_999, 60_000,
])('lifetime bounds an issued grant at offset %i', async (offset) => {
  const { StorageImage, storageRoute } = createPrivateStorageImages({
    images,
    authorize: () => true,
    lifetime: 60_000,
  })
  const url = firstUrl(renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />))
  vi.setSystemTime(Date.now() + offset)
  const response = await storageRoute(new Request(url))
  const location = response.headers.get('location')
  if (location === null) throw new Error('Expected a redirect')
  const remaining = expiry(new URL(location)) - Date.now()
  expect(remaining).toBeGreaterThanOrEqual(30_000)
  expect(remaining).toBeLessThanOrEqual(60_000)
})

test('an explicit half-lifetime rotation retains its margin just before the boundary', async () => {
  const { StorageImage, storageRoute } = createPrivateStorageImages({
    images,
    authorize: () => true,
    lifetime: 60_000,
    rotationIntervalMs: 30_000,
  })
  const url = firstUrl(renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />))
  vi.setSystemTime(Date.now() + 29_999)
  const location = (await storageRoute(new Request(url))).headers.get('location')
  if (location === null) throw new Error('Expected a redirect')
  expect(expiry(new URL(location)) - Date.now()).toBe(30_001)
})

test('long public lifetimes never lengthen private grants beyond 48 hours', async () => {
  const { StorageImage, storageRoute } = createPrivateStorageImages({
    images,
    authorize: () => true,
    public: ['website/'],
    lifetime: '365d',
  })
  const url = firstUrl(renderToStaticMarkup(<StorageImage src="logo.png" alt="Private logo" />))
  const location = (await storageRoute(new Request(url))).headers.get('location')
  if (location === null) throw new Error('Expected a redirect')
  expect(expiry(new URL(location)) - Date.now()).toBeLessThanOrEqual(48 * 3_600_000)
  expect(() =>
    createPrivateStorageImages({ images, authorize: () => true, lifetime: '365d' }),
  ).toThrow(/48 hours/)
})

test('a Built-in bump preserves old markup and signs with the new Built-in', async () => {
  const configuration = { images, authorize: vi.fn(() => true) }
  const old = createPrivateStorageImages(configuration)
  const url = firstUrl(renderToStaticMarkup(<old.StorageImage src="website/hero.jpg" alt="Hero" />))
  builtin.template = 'builtin/storage-preview@0.0.3'
  const current = createPrivateStorageImages(configuration)
  const response = await current.storageRoute(new Request(url))
  expect(response.status).toBe(307)
  expect(configuration.authorize).toHaveBeenCalledOnce()
  const location = response.headers.get('location')
  if (location === null) throw new Error('Expected a redirect')
  expect(parseSmartCdnUrl(location).template).toBe('builtin/storage-preview@0.0.3')
  const custom = createPrivateStorageImages({ ...configuration, template: 'my-custom-preview' })
  expect((await custom.storageRoute(new Request(url))).status).toBe(404)
})

test('direct factory imports need no credentials; first use validates them lazily', async () => {
  vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', undefined)
  const { StorageImage } = createStorageImages({ images })
  const onError = vi.fn()
  const stream = await renderToReadableStream(<StorageImage src="website/hero.jpg" alt="Hero" />, {
    onError,
  })
  await stream.allReady
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ message: expect.stringContaining('TRANSLOADIT_SMART_CDN_SECRET') }),
    expect.anything(),
  )
  expect(connection).toHaveBeenCalled()
})

test('explicit credentials use the same flat catalog configuration', () => {
  const { StorageImage } = createTransloaditImage({
    authKey: 'explicit-key',
    authSecret: 'explicit-secret',
    workspace: 'explicit-app',
    images,
    public: ['website/'],
  })
  expect(
    firstUrl(renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />)).hostname,
  ).toBe('explicit-app.tlcdn.com')
})
