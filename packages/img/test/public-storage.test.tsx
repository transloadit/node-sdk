// @vitest-environment happy-dom
import { getSignedSmartCdnUrl, parseSmartCdnUrl } from '@transloadit/utils/node'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const storageReference = vi.hoisted(() => ({
  workspace: 'my-app',
  asset_id: 'A'.repeat(22),
  version_id: 'B'.repeat(21) + 'A',
}))

const { connection } = vi.hoisted(() => ({ connection: vi.fn(async () => undefined) }))
vi.mock('next/server.js', () => ({ connection }))
vi.mock('server-only', () => ({}))

import { createImages } from '../src/next/server.tsx'

const hash = 'd41d8cd98f00b204e9800998ecf8427e'
const images = {
  'website/hero.jpg': {
    ...storageReference,
    path: 'website/hero.jpg',
    width: 2400,
    height: 1600,
    md5hash: hash,
  },
  'private/avatar.png': {
    ...storageReference,
    path: 'private/avatar.png',
    width: 400,
    height: 300,
    md5hash: hash,
  },
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

test.each([
  { width: 1000, height: 6000 },
  { width: 6000, height: 1000 },
])('all public candidates and fallbacks respect both dimension limits (%j)', (dimensions) => {
  const { Image } = createImages({
    images: {
      'website/large.jpg': { ...storageReference, path: 'website/large.jpg', ...dimensions },
    },
    public: ['website/'],
  })
  const markup = renderToStaticMarkup(<Image src="website/large.jpg" alt="Large" width={960} />)
  const document = new DOMParser().parseFromString(markup, 'text/html')
  const candidates = [...document.querySelectorAll('source')].flatMap(
    (source) =>
      source
        .getAttribute('srcset')
        ?.split(', ')
        .map((candidate) => candidate.split(' ')[0]) ?? [],
  )
  for (const url of [...candidates, imageUrl(markup)]) {
    if (url === undefined) throw new Error('Expected a URL')
    const { urlParams } = parseSmartCdnUrl(url)
    expect(Number(urlParams?.w)).toBeLessThanOrEqual(4096)
    expect(Number(urlParams?.h)).toBeLessThanOrEqual(4096)
  }
})

test('public art-direction crops and fallback obey the height cap', () => {
  const { Image } = createImages({
    images: {
      'website/large.jpg': {
        ...storageReference,
        path: 'website/large.jpg',
        width: 6000,
        height: 6000,
      },
    },
    public: ['website/'],
  })
  const markup = renderToStaticMarkup(
    <Image
      src="website/large.jpg"
      alt="Crop"
      layout="fill"
      fit="cover"
      aspectRatio={{ default: '1/6', '(min-width: 900px)': '6/1' }}
    />,
  )
  const document = new DOMParser().parseFromString(markup, 'text/html')
  for (const source of document.querySelectorAll('source')) {
    for (const candidate of source.getAttribute('srcset')?.split(', ') ?? []) {
      const url = candidate.split(' ')[0]
      if (url === undefined) throw new Error('Expected a candidate URL')
      const { urlParams } = parseSmartCdnUrl(url)
      expect(Number(urlParams?.w)).toBeLessThanOrEqual(4096)
      expect(Number(urlParams?.h)).toBeLessThanOrEqual(4096)
    }
  }
  expect(Number(parseSmartCdnUrl(imageUrl(markup)).urlParams?.h)).toBeLessThanOrEqual(4096)
})

test('public encoding quality rejects unsupported values before emitting unusable URLs', () => {
  const { Image } = createImages({ images, public: ['website/'] })
  expect(() =>
    renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" fallbackQuality={86} />),
  ).toThrow(/quality.*85/i)
  expect(() =>
    renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" formats={{ webp: 86 }} />),
  ).toThrow(/quality.*85/i)
})

test('Built-in URLs omit defaults but retain transparent format parameters and explicit dimensions', () => {
  const { Image } = createImages({ images, public: ['website/'] })
  const markup = renderToStaticMarkup(
    <Image src="website/hero.jpg" alt="Hero" formats={{ avif: 45, webp: 75 }} />,
  )
  const fallback = parseSmartCdnUrl(imageUrl(markup))
  expect(fallback.urlParams).toEqual({ w: '2400', h: '1600', v: storageReference.version_id })
  const doc = new DOMParser().parseFromString(markup, 'text/html')
  const webp = doc.querySelector('source[type="image/webp"]')?.getAttribute('srcset')?.split(' ')[0]
  if (webp === undefined) throw new Error('Missing WebP candidate')
  expect(parseSmartCdnUrl(webp).urlParams).toEqual({
    w: '320',
    h: '213',
    f: 'webp',
    bg: '#00000000',
    v: storageReference.version_id,
  })
})

test('custom Templates keep every transform field because their defaults are not known', () => {
  const { Image } = createImages({
    images,
    public: ['website/'],
    publicTemplate: 'customer-preview-template',
    delivery: { urlParams: { cdn: 'required' } },
  })
  const url = imageUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />))
  expect(parseSmartCdnUrl(url).urlParams).toEqual({
    w: '2400',
    h: '1600',
    f: 'jpg',
    bg: '#ffffff',
    r: 'pad',
    q: '75',
    cdn: 'required',
  })
})

test('nondefault crop, background and quality remain explicit on compact Built-in URLs', () => {
  const { Image } = createImages({
    images,
    public: ['website/'],
    delivery: { urlParams: { cdn: 'required' } },
  })
  const url = imageUrl(
    renderToStaticMarkup(
      <Image
        src={{ ...storageReference, path: 'website/hero.jpg', width: 200, height: 200 }}
        alt="Hero"
        layout="fixed"
        width={200}
        height={200}
        fit="cover"
        fallbackQuality={80}
        fallbackBackground="#224466"
      />,
    ),
  )
  expect(parseSmartCdnUrl(url).urlParams).toEqual({
    w: '200',
    h: '200',
    bg: '#224466',
    r: 'fillcrop',
    q: '80',
    cdn: 'required',
    v: storageReference.version_id,
  })
})

test('a private redirect signs the compact parameters and retains authentication and expiry', async () => {
  const authorize = vi.fn(() => true)
  const { Image, imageRoute } = createImages({
    images,
    authorize,
    authKey: 'signing-key',
    authSecret: 'signing-secret',
  })
  const path = imageUrl(renderToStaticMarkup(<Image src="private/avatar.png" alt="Private" />))
  const response = await imageRoute(new Request(new URL(path, 'https://app.example')))
  expect(response.status).toBe(307)
  const target = response.headers.get('location')
  if (target === null) throw new Error('Missing signed redirect')
  const parsed = parseSmartCdnUrl(target)
  expect(parsed.urlParams).toEqual({ w: '400', h: '300', v: storageReference.version_id })
  expect(parsed.auth?.expiresAt).toBeGreaterThan(Date.now())
  if (parsed.auth === undefined) throw new Error('Missing signature')
  expect(target).toBe(
    getSignedSmartCdnUrl({
      workspace: 'my-app',
      authKey: 'signing-key',
      authSecret: 'signing-secret',
      expiresAt: parsed.auth.expiresAt,
      input: storageReference.asset_id,
      template: 'builtin/storage-preview@0.0.3',
      urlParams: { w: 400, h: 300, v: storageReference.version_id },
    }),
  )
  expect(authorize).toHaveBeenCalledOnce()
  expect(await response.text()).toBe('')
})

test('public receipt images render permanent versioned URLs without any signing credentials', () => {
  const { Image } = createImages({ images, public: ['website/'] })
  const markup = renderToStaticMarkup(
    <Image src="website/hero.jpg" alt="Hero" layout="constrained" width={960} priority />,
  )
  const parsed = parseSmartCdnUrl(imageUrl(markup))
  expect(parsed.template).toBe('builtin/public-preview@0.0.2')
  expect(parsed.auth).toBeUndefined()
  expect(parsed.urlParams.v).toBe(storageReference.version_id)
  expect(markup).not.toMatch(/auth_key|sig=|exp=|\/api\/storage-images|visibility:hidden/)
  expect(connection).not.toHaveBeenCalled()
})

test('an empty catalog can declare public directories before its first upload', () => {
  const { Image } = createImages({ images: {}, public: ['website/'] })
  const markup = renderToStaticMarkup(<Image src={images['website/hero.jpg']} alt="Hero" />)
  expect(parseSmartCdnUrl(imageUrl(markup)).auth).toBeUndefined()
  expect(() => Image({ src: images['private/avatar.png'], alt: 'Private' })).toThrow(
    /outside the configured allowed prefixes/,
  )
})

test.each([
  { allowedPathPrefixes: [] },
  { allowedPathPrefixes: ['private/'] },
])('public declarations cannot widen an explicit allowed policy $allowedPathPrefixes', ({
  allowedPathPrefixes,
}) => {
  expect(() => createImages({ images: {}, allowedPathPrefixes, public: ['website/'] })).toThrow(
    /public prefixes must be within allowedPathPrefixes/,
  )
})

test('public rendering never validates unused secret env and is independent of clock and private lifetime', () => {
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', ' invalid ')
  vi.stubEnv('TRANSLOADIT_SECRET', ' invalid ')
  const now = vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000)
  const render = (): string => {
    const { Image } = createImages({ images, public: ['website/'], lifetime: '2h' })
    return renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />)
  }
  const first = render()
  now.mockReturnValue(2_900_000_000_000)
  expect(render()).toBe(first)
})

test('a new version gets a new public cache key; receipt identities are snapshotted', () => {
  const catalog = structuredClone(images)
  const { Image } = createImages({ images: catalog, public: ['website/'] })
  catalog['website/hero.jpg'].version_id = 'C'.repeat(21) + 'A'
  const old = imageUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />))
  const current = createImages({ images: catalog, public: ['website/'] })
  const next = imageUrl(renderToStaticMarkup(<current.Image src="website/hero.jpg" alt="Hero" />))
  expect(new URL(old).searchParams.get('v')).toBe(storageReference.version_id)
  expect(new URL(next).searchParams.get('v')).toBe('C'.repeat(21) + 'A')
  expect(next).not.toBe(old)
})

test('a geometry-only Storage receipt requires recovery instead of inventing a version', () => {
  const { Image } = createImages({
    images: { 'website/legacy.jpg': { path: 'website/legacy.jpg', width: 800, height: 600 } },
    public: ['website/'],
  })
  expect(() => renderToStaticMarkup(<Image src="website/legacy.jpg" alt="Legacy" />)).toThrow(
    /storage receipts sync/,
  )
})

test.each([
  `${'a'.repeat(512)}/`,
  `${'é'.repeat(256)}/`,
])('rejects an oversized public directory %s', (prefix) => {
  expect(() => createImages({ allowedPathPrefixes: [prefix], public: [prefix] })).toThrow(/512/)
})

test('public directories can contain exactly 512 UTF-8 bytes', () => {
  const prefix = `${'é'.repeat(255)}a/`
  expect(() => createImages({ allowedPathPrefixes: [prefix], public: [prefix] })).not.toThrow()
})

test('an explicit key cannot silently borrow an environment secret from another credential', () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'combined-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'combined-secret')
  const { Image } = createImages({
    images,
    authKey: 'different-key',
    authorize: () => true,
  })
  expect(() => Image({ src: 'private/avatar.png', alt: 'Private' })).toThrow(/authSecret/)
})

test('a partial Smart CDN override cannot borrow the combined key secret', () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'combined-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'combined-secret')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'different-key')
  const { Image } = createImages({ images, authorize: () => true })
  expect(() => Image({ src: 'private/avatar.png', alt: 'Private' })).toThrow(
    /TRANSLOADIT_SMART_CDN_SECRET/,
  )
})

test('a public-only selection cannot silently sign a private catalog member', () => {
  const { Image } = createImages({ images, public: ['website/'] })
  expect(() => Image({ src: 'private/avatar.png', alt: 'Private' })).toThrow(/authorize.*delivery/)
  expect(connection).not.toHaveBeenCalled()
})

test('mixed public/private uses unsigned public delivery and a signed authorized private target with the login key', async () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'combined-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'combined-secret')
  const authorize = vi.fn(() => true)
  const { Image, imageRoute } = createImages({
    images,
    public: ['website/'],
    authorize,
  })
  const publicUrl = imageUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />))
  expect(parseSmartCdnUrl(publicUrl).auth).toBeUndefined()
  const privateUrl = imageUrl(renderToStaticMarkup(<Image src="private/avatar.png" alt="Avatar" />))
  expect(privateUrl).toMatch(/^\/api\/storage-images\?cap=/)
  const response = await imageRoute(new Request(new URL(privateUrl, 'https://app.example')))
  expect(response.status).toBe(307)
  const target = response.headers.get('location')
  if (target === null) throw new Error('Expected authorized redirect')
  expect(parseSmartCdnUrl(target).auth?.key).toBe('combined-key')
  expect(parseSmartCdnUrl(target).template).toBe('builtin/storage-preview@0.0.3')
  expect(new URL(target).searchParams.get('v')).toBe(storageReference.version_id)
  expect(authorize).toHaveBeenCalledOnce()
  expect(response.headers.get('cache-control')).toBe('private, no-store')
})

test('the existing Smart CDN key pair remains a deliberate override', async () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'combined-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'combined-secret')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'render-key')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', 'render-secret')
  const { Image, imageRoute } = createImages({ images, authorize: () => true })
  const src = imageUrl(renderToStaticMarkup(<Image src="private/avatar.png" alt="Avatar" />))
  const target = (await imageRoute(new Request(new URL(src, 'https://app.example')))).headers.get(
    'location',
  )
  if (target === null) throw new Error('Expected a redirect')
  expect(parseSmartCdnUrl(target).auth?.key).toBe('render-key')
})

test('pinning a private Template does not replace the public Built-in', () => {
  const { Image } = createImages({
    images,
    public: ['website/'],
    template: 'builtin/storage-preview@0.0.3',
  })
  const url = imageUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />))
  expect(parseSmartCdnUrl(url).template).toBe('builtin/public-preview@0.0.2')
  expect(parseSmartCdnUrl(url).auth).toBeUndefined()
})

test('custom public and private Templates can be selected independently in a mixed factory', async () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'combined-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'combined-secret')
  const { Image, imageRoute } = createImages({
    images,
    public: ['website/'],
    authorize: () => true,
    template: 'private-preview',
    publicTemplate: 'public-preview',
  })
  const publicUrl = imageUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />))
  expect(parseSmartCdnUrl(publicUrl).template).toBe('public-preview')
  expect(parseSmartCdnUrl(publicUrl).auth).toBeUndefined()
  const privateUrl = imageUrl(
    renderToStaticMarkup(<Image src="private/avatar.png" alt="Private" />),
  )
  const response = await imageRoute(new Request(new URL(privateUrl, 'https://app.example')))
  const target = response.headers.get('location')
  if (target === null) throw new Error('Expected a signed private redirect')
  expect(parseSmartCdnUrl(target).template).toBe('private-preview')
  expect(parseSmartCdnUrl(target).auth?.key).toBe('combined-key')
})

test('private lifetime stays capped at 48 hours even in a mixed factory', () => {
  expect(() =>
    createImages({ images, public: ['website/'], authorize: () => true, lifetime: '365d' }),
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
  const { Image } = createImages({ images, public: ['website/'] })
  expect(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />)).toContain('<picture>')
  await vi.waitFor(() =>
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('transloadit storage publish -- website/'),
    ),
  )
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('"website/hero.jpg"'))
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining('no longer be under a published public prefix'),
  )
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining('remove its public prefix from the catalog or factory'),
  )
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining('configure private delivery with application authorization'),
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
  const { Image } = createImages({ images, public: ['website/'] })
  renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />)
  await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining(hint)))
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining(
      'https://my-app.tlcdn.com/builtin%2Fpublic-preview%400.0.2/AAAAAAAAAAAAAAAAAAAAAA',
    ),
  )
  expect(warn.mock.calls.flat().join('\n')).not.toContain('transloadit storage publish')
})

test('identifies the verified public delivery target without logging query parameters', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(null, {
          headers: { 'Content-Type': 'image/avif', 'Cache-Control': 'public, immutable' },
        }),
    ),
  )
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  const { Image } = createImages({ images, public: ['website/'] })
  renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />)
  await vi.waitFor(() =>
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://my-app.tlcdn.com/builtin%2Fpublic-preview%400.0.2/AAAAAAAAAAAAAAAAAAAAAA',
      ),
    ),
  )
  expect(info.mock.calls.flat().join('\n')).not.toContain('?')
})
