// @vitest-environment happy-dom
import { parseSmartCdnUrl } from '@transloadit/utils/node'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const { connection } = vi.hoisted(() => ({ connection: vi.fn(async () => undefined) }))
vi.mock('next/server.js', () => ({ connection }))
vi.mock('server-only', () => ({}))

import { createStorageImages } from '../src/next/server.tsx'

const hash = 'd41d8cd98f00b204e9800998ecf8427e'
const images = {
  'website/hero.jpg': { path: 'website/hero.jpg', width: 2400, height: 1600, md5hash: hash },
  'private/avatar.png': { path: 'private/avatar.png', width: 400, height: 300, md5hash: hash },
}

function imageUrl(markup: string): string {
  const src = new DOMParser()
    .parseFromString(markup, 'text/html')
    .querySelector('img')
    ?.getAttribute('src')
  if (src === undefined || src === null) throw new Error('Expected an image source')
  return src
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('TRANSLOADIT_WORKSPACE', 'my-app')
  for (const name of [
    'TRANSLOADIT_KEY',
    'TRANSLOADIT_SECRET',
    'TRANSLOADIT_SMART_CDN_KEY',
    'TRANSLOADIT_SMART_CDN_SECRET',
  ])
    vi.stubEnv(name, undefined)
  connection.mockClear()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('public receipt images render permanent versioned URLs without any signing credentials', () => {
  const { StorageImage } = createStorageImages({ images, public: ['website/'] })
  const markup = renderToStaticMarkup(
    <StorageImage src="website/hero.jpg" alt="Hero" layout="constrained" width={960} priority />,
  )
  const parsed = parseSmartCdnUrl(imageUrl(markup))
  expect(parsed.template).toBe('builtin/public-preview@0.0.1')
  expect(parsed.auth).toBeUndefined()
  expect(parsed.urlParams.v).toBe(hash.slice(0, 16))
  expect(markup).not.toMatch(/auth_key|sig=|exp=|\/api\/storage-images|visibility:hidden/)
  expect(connection).not.toHaveBeenCalled()
})

test('an empty catalog can declare public directories before its first upload', () => {
  const { StorageImage } = createStorageImages({ images: {}, public: ['website/'] })
  const markup = renderToStaticMarkup(<StorageImage src={images['website/hero.jpg']} alt="Hero" />)
  expect(parseSmartCdnUrl(imageUrl(markup)).auth).toBeUndefined()
  expect(() => StorageImage({ src: images['private/avatar.png'], alt: 'Private' })).toThrow(
    /outside the configured allowed prefixes/,
  )
})

test.each([
  { allowedPathPrefixes: [] },
  { allowedPathPrefixes: ['private/'] },
])('public declarations cannot widen an explicit allowed policy $allowedPathPrefixes', ({
  allowedPathPrefixes,
}) => {
  expect(() =>
    createStorageImages({ images: {}, allowedPathPrefixes, public: ['website/'] }),
  ).toThrow(/public prefixes must be within allowedPathPrefixes/)
})

test('public rendering never validates unused secret env and is independent of clock and private lifetime', () => {
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', ' invalid ')
  vi.stubEnv('TRANSLOADIT_SECRET', ' invalid ')
  const now = vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000)
  const render = (): string => {
    const { StorageImage } = createStorageImages({ images, public: ['website/'], lifetime: '2h' })
    return renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />)
  }
  const first = render()
  now.mockReturnValue(2_900_000_000_000)
  expect(render()).toBe(first)
})

test('changed bytes get a new public cache key; receipt hashes are snapshotted', () => {
  const catalog = structuredClone(images)
  const { StorageImage } = createStorageImages({ images: catalog, public: ['website/'] })
  catalog['website/hero.jpg'].md5hash = 'a'.repeat(32)
  const old = imageUrl(renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />))
  const current = createStorageImages({ images: catalog, public: ['website/'] })
  const next = imageUrl(
    renderToStaticMarkup(<current.StorageImage src="website/hero.jpg" alt="Hero" />),
  )
  expect(new URL(old).searchParams.get('v')).toBe(hash.slice(0, 16))
  expect(new URL(next).searchParams.get('v')).toBe('a'.repeat(16))
  expect(next).not.toBe(old)
})

test('a geometry-only receipt uses the ordinary public cache policy without inventing a version', () => {
  const { StorageImage } = createStorageImages({
    images: { 'website/legacy.jpg': { path: 'website/legacy.jpg', width: 800, height: 600 } },
    public: ['website/'],
  })
  const url = new URL(
    imageUrl(renderToStaticMarkup(<StorageImage src="website/legacy.jpg" alt="Legacy" />)),
  )
  expect(url.searchParams.has('v')).toBe(false)
  expect(url.searchParams.has('sig')).toBe(false)
})

test.each([
  `${'a'.repeat(512)}/`,
  `${'é'.repeat(256)}/`,
])('rejects an oversized public directory %s', (prefix) => {
  expect(() => createStorageImages({ allowedPathPrefixes: [prefix], public: [prefix] })).toThrow(
    /512/,
  )
})

test('public directories can contain exactly 512 UTF-8 bytes', () => {
  const prefix = `${'é'.repeat(255)}a/`
  expect(() =>
    createStorageImages({ allowedPathPrefixes: [prefix], public: [prefix] }),
  ).not.toThrow()
})

test('an explicit key cannot silently borrow an environment secret from another credential', () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'combined-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'combined-secret')
  const { StorageImage } = createStorageImages({
    images,
    authKey: 'different-key',
    authorize: () => true,
  })
  expect(() => StorageImage({ src: 'private/avatar.png', alt: 'Private' })).toThrow(/authSecret/)
})

test('a partial Smart CDN override cannot borrow the combined key secret', () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'combined-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'combined-secret')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'different-key')
  const { StorageImage } = createStorageImages({ images, authorize: () => true })
  expect(() => StorageImage({ src: 'private/avatar.png', alt: 'Private' })).toThrow(
    /TRANSLOADIT_SMART_CDN_SECRET/,
  )
})

test('a public-only selection cannot silently sign a private catalog member', () => {
  const { StorageImage } = createStorageImages({ images, public: ['website/'] })
  expect(() => StorageImage({ src: 'private/avatar.png', alt: 'Private' })).toThrow(
    /authorize.*delivery/,
  )
  expect(connection).not.toHaveBeenCalled()
})

test('mixed public/private uses unsigned public delivery and a signed authorized private target with the login key', async () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'combined-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'combined-secret')
  const authorize = vi.fn(() => true)
  const { StorageImage, storageRoute } = createStorageImages({
    images,
    public: ['website/'],
    authorize,
  })
  const publicUrl = imageUrl(
    renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />),
  )
  expect(parseSmartCdnUrl(publicUrl).auth).toBeUndefined()
  const privateUrl = imageUrl(
    renderToStaticMarkup(<StorageImage src="private/avatar.png" alt="Avatar" />),
  )
  expect(privateUrl).toMatch(/^\/api\/storage-images\?cap=/)
  const response = await storageRoute(new Request(new URL(privateUrl, 'https://app.example')))
  expect(response.status).toBe(307)
  const target = response.headers.get('location')
  if (target === null) throw new Error('Expected authorized redirect')
  expect(parseSmartCdnUrl(target).auth?.key).toBe('combined-key')
  expect(parseSmartCdnUrl(target).template).toBe('builtin/storage-preview@0.0.2')
  expect(new URL(target).searchParams.has('v')).toBe(false)
  expect(authorize).toHaveBeenCalledOnce()
  expect(response.headers.get('cache-control')).toBe('private, no-store')
})

test('the existing Smart CDN key pair remains a deliberate override', async () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'combined-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'combined-secret')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'render-key')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', 'render-secret')
  const { StorageImage, storageRoute } = createStorageImages({ images, authorize: () => true })
  const src = imageUrl(renderToStaticMarkup(<StorageImage src="private/avatar.png" alt="Avatar" />))
  const target = (await storageRoute(new Request(new URL(src, 'https://app.example')))).headers.get(
    'location',
  )
  if (target === null) throw new Error('Expected a redirect')
  expect(parseSmartCdnUrl(target).auth?.key).toBe('render-key')
})

test('pinning a private Template does not replace the public Built-in', () => {
  const { StorageImage } = createStorageImages({
    images,
    public: ['website/'],
    template: 'builtin/storage-preview@0.0.2',
  })
  const url = imageUrl(renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />))
  expect(parseSmartCdnUrl(url).template).toBe('builtin/public-preview@0.0.1')
  expect(parseSmartCdnUrl(url).auth).toBeUndefined()
})

test('custom public and private Templates can be selected independently in a mixed factory', async () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'combined-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'combined-secret')
  const { StorageImage, storageRoute } = createStorageImages({
    images,
    public: ['website/'],
    authorize: () => true,
    template: 'private-preview',
    publicTemplate: 'public-preview',
  })
  const publicUrl = imageUrl(
    renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />),
  )
  expect(parseSmartCdnUrl(publicUrl).template).toBe('public-preview')
  expect(parseSmartCdnUrl(publicUrl).auth).toBeUndefined()
  const privateUrl = imageUrl(
    renderToStaticMarkup(<StorageImage src="private/avatar.png" alt="Private" />),
  )
  const response = await storageRoute(new Request(new URL(privateUrl, 'https://app.example')))
  const target = response.headers.get('location')
  if (target === null) throw new Error('Expected a signed private redirect')
  expect(parseSmartCdnUrl(target).template).toBe('private-preview')
  expect(parseSmartCdnUrl(target).auth?.key).toBe('combined-key')
})

test('private lifetime stays capped at 48 hours even in a mixed factory', () => {
  expect(() =>
    createStorageImages({ images, public: ['website/'], authorize: () => true, lifetime: '365d' }),
  ).toThrow(/48 hours/)
})

test('a denied unsigned development HEAD gives the publish command without blocking the render', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () =>
      new Response(null, { status: 400, headers: { 'Transloadit-Error': 'NO_SIGNATURE_FIELD' } }),
  )
  vi.stubGlobal('fetch', fetch)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { StorageImage } = createStorageImages({ images, public: ['website/'] })
  expect(renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />)).toContain(
    '<picture>',
  )
  await vi.waitFor(() =>
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('transloadit storage publish website/'),
    ),
  )
  const url = fetch.mock.calls[0]?.[0]
  expect(typeof url).toBe('string')
  expect(String(url)).not.toContain('sig=')
})

test.each([
  { status: 400, code: undefined, hint: 'Check the delivery endpoint and Template' },
  { status: 400, code: 'INVALID_SIGNATURE', hint: 'Check the delivery endpoint and Template' },
  { status: 404, code: 'TEMPLATE_NOT_FOUND', hint: 'Check the workspace slug' },
  { status: 403, code: undefined, hint: 'Check the delivery endpoint and Template' },
])('does not mistake HTTP $status ($code) for an unpublished prefix', async ({
  status,
  code,
  hint,
}) => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(null, {
          status,
          headers: code === undefined ? {} : { 'Transloadit-Error': code },
        }),
    ),
  )
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { StorageImage } = createStorageImages({ images, public: ['website/'] })
  renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />)
  await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining(hint)))
  expect(warn.mock.calls.flat().join('\n')).not.toContain('transloadit storage publish')
})
