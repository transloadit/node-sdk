// @vitest-environment happy-dom

import { parseSmartCdnUrl } from '@transloadit/utils/node'
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import { rgbaToThumbHash, thumbHashToDataURL } from 'thumbhash'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const storageReference = vi.hoisted(() => ({
  workspace: 'my-app',
  asset_id: 'A'.repeat(22),
  version_id: 'B'.repeat(21) + 'A',
}))

const { connection, builtin } = vi.hoisted(() => ({
  connection: vi.fn(async () => undefined),
  builtin: { template: 'builtin/storage-preview@0.0.3' },
}))

vi.mock('next/server.js', () => ({ connection }))
vi.mock('server-only', () => ({}))
vi.mock('../src/index.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/index.ts')>()),
  get transloaditStoragePreviewTemplate() {
    return builtin.template
  },
}))

import { createImages } from '../src/next/server.tsx'

const images = {
  'website/hero.jpg': { ...storageReference, path: 'website/hero.jpg', width: 2400, height: 1600 },
  'logo.png': { ...storageReference, path: 'logo.png', width: 64, height: 64 },
}

function imagesForWorkspace(workspace: string): typeof images {
  return {
    'website/hero.jpg': { ...images['website/hero.jpg'], workspace },
    'logo.png': { ...images['logo.png'], workspace },
  }
}

const thumbhash = Buffer.from(rgbaToThumbHash(1, 1, [45, 110, 160, 255])).toString('base64')

test('the shortest valid ThumbHash from a narrow original still renders a blur', () => {
  const pixels = new Uint8Array(100 * 4).fill(255)
  const bytes = rgbaToThumbHash(1, 100, pixels)
  expect(bytes).toHaveLength(17)
  const { Image } = createImages({ images, public: ['website/'] })
  const markup = renderToStaticMarkup(
    <Image
      src={{
        ...storageReference,
        path: 'website/hero.jpg',
        width: 1,
        height: 100,
        thumbhash: Buffer.from(bytes).toString('base64'),
      }}
      alt="Narrow"
      placeholder="blur"
    />,
  )
  expect(markup).toContain(thumbHashToDataURL(bytes))
})

test('public blur decodes the receipt on the server without changing image URLs or native attributes', () => {
  const { Image } = createImages({ images, public: ['website/'] })
  const src = { ...images['website/hero.jpg'], thumbhash }
  const markup = renderToStaticMarkup(<Image src={src} alt="Blurred hero" placeholder="blur" />)
  const doc = new DOMParser().parseFromString(markup, 'text/html')
  const img = doc.querySelector('img')
  expect(img?.style.backgroundImage).toContain(thumbHashToDataURL(Buffer.from(thumbhash, 'base64')))
  expect(img?.style.backgroundSize).toBe('100% 100%')
  expect(img?.getAttribute('placeholder')).toBeNull()
  expect(firstUrl(markup)).toEqual(firstUrl(renderToStaticMarkup(<Image src={src} alt="Hero" />)))
})

test.each([
  'production',
  'development',
])('blur with no hash is a no-op, with a development-only note (%s)', (environment) => {
  vi.stubEnv('NODE_ENV', environment)
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(null, { status: 307, headers: { Location: 'https://cdn.example' } }),
    ),
  )
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const { Image } = createImages({ images, public: ['website/'] })
    const markup = renderToStaticMarkup(
      <Image src="website/hero.jpg" alt="Hero" placeholder="blur" />,
    )
    expect(markup).not.toContain('data:image/')
    if (environment === 'development')
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(/website\/hero.jpg.*thumbhash.*storage store/),
      )
    else expect(warn).not.toHaveBeenCalled()
  } finally {
    warn.mockRestore()
    vi.unstubAllGlobals()
  }
})

test('an alpha-encoded ThumbHash remains a no-op if a receipt omits hasAlpha', () => {
  const { Image } = createImages({ images, public: ['website/'] })
  const hash = Buffer.from(rgbaToThumbHash(1, 1, [45, 110, 160, 128])).toString('base64')
  const markup = renderToStaticMarkup(
    <Image
      src={{ ...images['website/hero.jpg'], thumbhash: hash }}
      alt="Alpha"
      placeholder="blur"
    />,
  )
  expect(markup).not.toContain('data:image/')
})

test.each([
  'contain',
  'none',
  'scale-down',
] as const)('blur cannot remain beside a letterboxed %s image', (objectFit) => {
  const { Image } = createImages({ images, public: ['website/'] })
  const markup = renderToStaticMarkup(
    <Image
      src={{ ...images['website/hero.jpg'], thumbhash }}
      alt="Letterboxed"
      placeholder="blur"
      layout="fixed"
      width={600}
      height={400}
      objectFit={objectFit}
    />,
  )
  expect(markup).not.toContain('data:image/')
})

test('a request-authorized private image never embeds its blurred pixels before authorization', () => {
  const authorize = vi.fn(() => false)
  const { Image } = createImages({ images, authorize })
  const markup = renderToStaticMarkup(
    <Image src={{ ...images['website/hero.jpg'], thumbhash }} alt="Private" placeholder="blur" />,
  )
  expect(markup).not.toContain('data:image/')
  expect(markup).not.toContain(thumbhash)
  expect(authorize).not.toHaveBeenCalled()
})

test.each([
  'production',
  'development',
])('transparent images omit blur without adding client code (%s)', (environment) => {
  vi.stubEnv('NODE_ENV', environment)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 200 })),
  )
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const { Image } = createImages({
      images: { 'website/hero.jpg': { ...images['website/hero.jpg'], thumbhash, hasAlpha: true } },
      public: ['website/'],
    })
    const markup = renderToStaticMarkup(
      <Image src="website/hero.jpg" alt="Transparent hero" placeholder="blur" />,
    )
    const image = new DOMParser().parseFromString(markup, 'text/html').querySelector('img')
    expect(image?.style.backgroundImage).toBe('')
    expect(markup).not.toContain('data:image/')
    expect(image?.getAttribute('onload')).toBeNull()
    if (environment === 'development')
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('transparent image: no blur placeholder'),
      )
    else expect(warn).not.toHaveBeenCalled()
  } finally {
    warn.mockRestore()
    vi.unstubAllGlobals()
  }
})

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
  builtin.template = 'builtin/storage-preview@0.0.3'
  connection.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

test('the committed project catalog renders public images with no environment configuration', () => {
  vi.stubEnv('TRANSLOADIT_WORKSPACE', undefined)
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', undefined)
  vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', undefined)
  const catalog = {
    workspace: 'catalog-app',
    public: ['website/'],
    images: imagesForWorkspace('catalog-app'),
  }
  const { Image } = createImages(catalog)
  expect(firstUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />)).hostname).toBe(
    'catalog-app.tlcdn.com',
  )
  expect(connection).not.toHaveBeenCalled()
})

test('explicit factories also understand the catalog delivery block, with top-level overrides winning', () => {
  const catalog = {
    workspace: 'catalog-app',
    public: ['website/'],
    images: imagesForWorkspace('catalog-app'),
    delivery: {
      baseUrl: 'http://127.0.0.1:32189/file/{workspace}',
      urlParams: { cdn: 'required' },
    },
  }
  const integration = createImages(catalog)
  const url = firstUrl(
    renderToStaticMarkup(<integration.Image src="website/hero.jpg" alt="Hero" />),
  )
  expect(url.origin).toBe('http://127.0.0.1:32189')
  expect(url.searchParams.get('cdn')).toBe('required')
  const overridden = createImages({
    ...catalog,
    baseUrl: 'https://images.example/{workspace}',
  })
  expect(
    firstUrl(renderToStaticMarkup(<overridden.Image src="website/hero.jpg" alt="Hero" />)).origin,
  ).toBe('https://images.example')
})

test('an explicit workspace cannot be replaced by a different environment default', () => {
  vi.stubEnv('TRANSLOADIT_WORKSPACE', 'override-app')
  const { Image } = createImages({
    workspace: 'catalog-app',
    public: ['website/'],
    images: imagesForWorkspace('catalog-app'),
  })
  expect(firstUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />)).hostname).toBe(
    'catalog-app.tlcdn.com',
  )
})

test('width is constrained by default and priority reserves an eager high-priority preload', () => {
  const { Image } = createImages({
    workspace: 'my-app',
    public: ['website/'],
    images,
  })
  const document = new DOMParser().parseFromString(
    renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" width={960} priority />),
    'text/html',
  )
  const image = document.querySelector('img')
  expect(image?.style.maxWidth).toBe('960px')
  expect(image?.style.width).toBe('100%')
  expect(image?.getAttribute('loading')).toBe('eager')
  expect(image?.getAttribute('fetchpriority')).toBe('high')
  expect(document.querySelector('link[rel="preload"]')?.getAttribute('fetchpriority')).toBe('high')
  expect(document.querySelector('source')?.getAttribute('sizes')).toBe(
    '(min-width: 960px) 960px, 100vw',
  )
})

test('the default width never enlarges a small receipt', () => {
  const { Image } = createImages({ images, public: ['website/'] })
  const markup = renderToStaticMarkup(
    <Image
      src={{ ...storageReference, path: 'website/small.jpg', width: 320, height: 240 }}
      alt="Small"
      width={960}
    />,
  )
  expect(markup).toContain('max-width:320px')
  expect(markup).toContain('width="320"')
  expect(markup).toContain('height="240"')
})

test('duration strings and millisecond aliases issue identical capabilities and redirects', async () => {
  const short = createImages({
    images,
    authorize: () => true,
    cacheMaxAge: '1m',
    rotationInterval: '10m',
    lifetime: '1h',
  })
  const legacy = createImages({
    images,
    authorize: () => true,
    cacheMaxAgeMs: 60_000,
    rotationIntervalMs: 600_000,
    lifetime: 3_600_000,
  })
  const url = firstUrl(renderToStaticMarkup(<short.Image src="website/hero.jpg" alt="Hero" />))
  expect(
    firstUrl(renderToStaticMarkup(<legacy.Image src="website/hero.jpg" alt="Hero" />)),
  ).toEqual(url)
  const response = await short.imageRoute(new Request(url))
  expect(response.headers.get('cache-control')).toBe('private, max-age=60')
  expect(response.headers.get('location')).toBe(
    (await legacy.imageRoute(new Request(url))).headers.get('location'),
  )
})

test('art direction derives a responsive box and permits an externally owned fill box', () => {
  const { Image } = createImages({ images, public: ['website/'] })
  const aspectRatio = { '(max-width: 639px)': '9/16', default: '16/9' }
  const markup = renderToStaticMarkup(
    <Image src="website/hero.jpg" alt="Hero" layout="fill" fit="cover" aspectRatio={aspectRatio} />,
  )
  expect(markup).toContain('aspect-ratio:1.7777777777777777')
  expect(markup).toContain('@media (max-width: 639px)')
  expect(markup).toContain('aspect-ratio:0.5625')
  const external = renderToStaticMarkup(
    <Image
      src="website/hero.jpg"
      alt="Hero"
      layout="fill"
      fit="cover"
      aspectRatio={aspectRatio}
      frame={false}
    />,
  )
  expect(external).not.toContain('aspect-ratio')
})

test('requires an explicit delivery choice, naming all three alternatives', () => {
  expect(() => createImages({ images })).toThrow(/Choose public, authorize, or delivery: 'direct'/)
})

test('a recovered private catalog explains intentional publication without guessing public access', () => {
  expect(() => createImages({ workspace: 'my-app', public: [], images })).toThrow(
    /No public prefixes.*storage publish.*authorize/s,
  )
  expect(connection).not.toHaveBeenCalled()
})

test('one factory accepts explicit credentials and retains the redirect overload', async () => {
  vi.stubEnv('TRANSLOADIT_WORKSPACE', undefined)
  const { Image, imageRoute } = createImages({
    images: imagesForWorkspace('explicit-app'),
    authKey: 'explicit-key',
    authSecret: 'explicit-secret',
    workspace: 'explicit-app',
    authorize: () => true,
  })
  const url = firstUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />))
  const location = (await imageRoute(new Request(url))).headers.get('location')
  expect(location).not.toBeNull()
  expect(new URL(location ?? '').hostname).toBe('explicit-app.tlcdn.com')
})

test('exports only the single Next.js factory, not the unpublished aliases', async () => {
  const exports = await import('../src/next/server.tsx')
  expect(Object.keys(exports)).toEqual(['createImages'])
})

test('public catalog images are static with unsigned direct URLs and no signing shell', () => {
  const { Image } = createImages({ images, public: ['website/'] })
  const markup = renderToStaticMarkup(
    <Image src="website/hero.jpg" alt="Hero" layout="constrained" width={960} priority />,
  )
  const url = firstUrl(markup)
  expect(url.hostname).toBe('my-app.tlcdn.com')
  expect(parseSmartCdnUrl(url.href).auth).toBeUndefined()
  expect(markup).not.toContain('visibility:hidden')
  expect(connection).not.toHaveBeenCalled()
  expect(markup).toContain('max-width:960px')
})

test('declared public images never expire or emit a dynamic-delivery warning', () => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { headers: { 'Content-Type': 'image/png' } })),
  )
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
  try {
    const { Image } = createImages({ images, public: ['website/'] })
    const markup = renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />)
    expect(parseSmartCdnUrl(firstUrl(markup).href).auth).toBeUndefined()
    expect(info).not.toHaveBeenCalled()
  } finally {
    info.mockRestore()
    vi.unstubAllGlobals()
  }
})

test('catalog directories accept DB receipts, but root entries do not authorize the workspace', () => {
  const { Image } = createImages({ images, authorize: () => true })
  expect(renderToStaticMarkup(<Image src="logo.png" alt="Logo" />)).toContain('width="64"')
  expect(
    renderToStaticMarkup(
      <Image
        src={{ ...storageReference, path: 'website/from-db.jpg', width: 300, height: 200 }}
        alt="DB"
      />,
    ),
  ).toContain('width="300"')
  expect(() =>
    Image({
      src: { ...storageReference, path: 'private.jpg', width: 20, height: 20 },
      alt: 'Private',
    }),
  ).toThrow(/allowed/)
})

test('explicit scope still limits catalog paths and public declarations', () => {
  const { Image } = createImages({
    images,
    allowedPathPrefixes: [],
    delivery: 'direct',
  })
  expect(() => Image({ src: 'website/hero.jpg', alt: 'Denied' })).toThrow(/allowed/)
  expect(() =>
    createImages({ images, allowedPathPrefixes: ['website/'], public: ['private/'] }),
  ).toThrow(/public.*allowed/)
})

test('catalog keys must agree with their receipt paths and unknown keys never fall through', () => {
  expect(() => createImages({ images: { 'public.jpg': images['website/hero.jpg'] } })).toThrow(
    /catalog.*path/,
  )
  const { Image } = createImages({ images, delivery: 'direct' })
  expect(() =>
    Reflect.apply(Image, undefined, [
      { src: 'website/typo.jpg', alt: 'Typo', width: 300, height: 200 },
    ]),
  ).toThrow(/catalog/)
})

test('a missing catalog path names the typo, nearest key and safe upload command', () => {
  const { Image } = createImages({ images, delivery: 'direct' })
  expect(() => Reflect.apply(Image, undefined, [{ src: 'website/herp.jpg', alt: 'Hero' }])).toThrow(
    /Storage image path "website\/herp.jpg".*Did you mean "website\/hero.jpg"/,
  )
  expect(() => Reflect.apply(Image, undefined, [{ src: 'website/herp.jpg', alt: 'Hero' }])).toThrow(
    'npx transloadit storage store -- ./image.jpg website/herp.jpg',
  )
  expect(() =>
    Reflect.apply(Image, undefined, [{ src: "-$(whoami)'photo.jpg", alt: 'Unknown' }]),
  ).toThrow("transloadit storage store -- ./image.jpg '-$(whoami)'\\''photo.jpg'")
})

test('an empty catalog names the missing path without inventing a suggestion', () => {
  const { Image } = createImages({ images: {}, delivery: 'direct' })
  expect(() => Reflect.apply(Image, undefined, [{ src: 'website/new.jpg', alt: 'New' }])).toThrow(
    /Storage image path "website\/new.jpg".*To upload a new image/,
  )
})

test('a custom-catalog recovery hint explains where receipts must be written', () => {
  const { Image } = createImages({ images, delivery: 'direct' })
  expect(() => Reflect.apply(Image, undefined, [{ src: 'website/new.jpg', alt: 'New' }])).toThrow(
    'For a custom catalog, add --receipts <catalog.json> to the command',
  )
  expect(() => Reflect.apply(Image, undefined, [{ src: 'website/new.jpg', alt: 'New' }])).toThrow(
    'For an explicit factory, update its images configuration too',
  )
})

test.each([
  '/website/hero.jpg',
  'website/hero.jpg ',
  ' website/hero.jpg',
])('an invalid formatting variant %j suggests the exact catalog key without upload advice', (path) => {
  const { Image } = createImages({ images, delivery: 'direct' })
  const render = () => Reflect.apply(Image, undefined, [{ src: path, alt: 'Hero' }])
  expect(render).toThrow(`Storage image path ${JSON.stringify(path)} is invalid`)
  expect(render).toThrow('Did you mean "website/hero.jpg"? Use the exact catalog key')
  expect(render).not.toThrow('storage store')
})

test.each([
  { name: 'terminal controls', path: 'website/\u001b[2J.jpg' },
  { name: 'newlines', path: 'website/new\nline.jpg' },
  { name: 'oversized paths', path: `${'a'.repeat(1025)}.jpg` },
])('rejects $name before formatting unknown-path shell advice', ({ path }) => {
  const { Image } = createImages({ images, delivery: 'direct' })
  const render = () => Reflect.apply(Image, undefined, [{ src: path, alt: 'Invalid' }])
  expect(render).toThrow(/Storage image paths must/)
  expect(render).not.toThrow(path)
  expect(render).not.toThrow('storage store')
})

test('workspace-root access requires the named acknowledgment, never an empty prefix', () => {
  expect(() => createImages({ allowedPathPrefixes: [''] })).toThrow(/allowWorkspaceRoot/)
  const { Image } = createImages({
    allowWorkspaceRoot: true,
    authorize: () => true,
  })
  expect(renderToStaticMarkup(<Image src={images['logo.png']} alt="Logo" />)).toContain('<picture>')
})

test.each([
  'constructor',
  'toString',
  '__proto__',
])('requires an own catalog entry for %s without excluding an explicitly stored file', (path) => {
  const missing = createImages({ images, delivery: 'direct' })
  expect(() =>
    Reflect.apply(missing.Image, undefined, [{ src: path, alt: 'Missing image' }]),
  ).toThrow(`Storage image path "${path}" is not in the configured catalog`)
  const present = createImages({
    images: { [path]: { ...storageReference, path, width: 64, height: 64 } },
    authorize: () => true,
  })
  expect(renderToStaticMarkup(<present.Image src={path} alt="Stored image" />)).toContain(
    'width="64"',
  )
})

test.each([
  30_001, 59_999, 60_000,
])('rejects a rotation interval of %i that leaves less than half the lifetime for delivery', (rotationIntervalMs) => {
  expect(() =>
    createImages({
      images,
      authorize: () => true,
      lifetime: 60_000,
      rotationIntervalMs,
    }),
  ).toThrow(/rotationIntervalMs.*half/)
  expect(() =>
    createImages({ images, public: ['website/'], lifetime: 60_000, rotationIntervalMs }),
  ).toThrow(/rotationIntervalMs.*half/)
})

test('rotation margin also applies at the private cap in a mixed public factory', () => {
  expect(() =>
    createImages({
      images,
      authorize: () => true,
      public: ['website/'],
      lifetime: '2d',
      rotationIntervalMs: 24 * 3_600_000 + 1,
    }),
  ).toThrow(/rotationIntervalMs.*half/)
})

test.each([
  0, 1, 29_999, 30_000, 59_999, 60_000,
])('lifetime bounds an issued grant at offset %i', async (offset) => {
  const { Image, imageRoute } = createImages({
    images,
    authorize: () => true,
    lifetime: 60_000,
  })
  const url = firstUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />))
  vi.setSystemTime(Date.now() + offset)
  const response = await imageRoute(new Request(url))
  const location = response.headers.get('location')
  if (location === null) throw new Error('Expected a redirect')
  const remaining = expiry(new URL(location)) - Date.now()
  expect(remaining).toBeGreaterThanOrEqual(30_000)
  expect(remaining).toBeLessThanOrEqual(60_000)
})

test('an explicit half-lifetime rotation retains its margin just before the boundary', async () => {
  const { Image, imageRoute } = createImages({
    images,
    authorize: () => true,
    lifetime: 60_000,
    rotationIntervalMs: 30_000,
  })
  const url = firstUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />))
  vi.setSystemTime(Date.now() + 29_999)
  const location = (await imageRoute(new Request(url))).headers.get('location')
  if (location === null) throw new Error('Expected a redirect')
  expect(expiry(new URL(location)) - Date.now()).toBe(30_001)
})

test('mixed public factories never lengthen private grants beyond 48 hours', async () => {
  const { Image, imageRoute } = createImages({
    images,
    authorize: () => true,
    public: ['website/'],
    lifetime: '2d',
  })
  const url = firstUrl(renderToStaticMarkup(<Image src="logo.png" alt="Private logo" />))
  const location = (await imageRoute(new Request(url))).headers.get('location')
  if (location === null) throw new Error('Expected a redirect')
  expect(expiry(new URL(location)) - Date.now()).toBeLessThanOrEqual(48 * 3_600_000)
  expect(() => createImages({ images, authorize: () => true, lifetime: '365d' })).toThrow(
    /48 hours/,
  )
})

test('a Built-in bump preserves old markup and signs with the new Built-in', async () => {
  const configuration = { images, authorize: vi.fn(() => true) }
  const old = createImages(configuration)
  const url = firstUrl(renderToStaticMarkup(<old.Image src="website/hero.jpg" alt="Hero" />))
  builtin.template = 'builtin/storage-preview@0.0.3'
  const current = createImages(configuration)
  const response = await current.imageRoute(new Request(url))
  expect(response.status).toBe(307)
  expect(configuration.authorize).toHaveBeenCalledOnce()
  const location = response.headers.get('location')
  if (location === null) throw new Error('Expected a redirect')
  expect(parseSmartCdnUrl(location).template).toBe('builtin/storage-preview@0.0.3')
  const custom = createImages({ ...configuration, template: 'my-custom-preview' })
  expect((await custom.imageRoute(new Request(url))).status).toBe(404)
})

test('direct factory imports need no credentials; first use validates them lazily', async () => {
  vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', undefined)
  const { Image } = createImages({ images, delivery: 'direct' })
  const onError = vi.fn()
  const stream = await renderToReadableStream(<Image src="website/hero.jpg" alt="Hero" />, {
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
  vi.stubEnv('TRANSLOADIT_WORKSPACE', undefined)
  const { Image } = createImages({
    authKey: 'explicit-key',
    authSecret: 'explicit-secret',
    workspace: 'explicit-app',
    images: imagesForWorkspace('explicit-app'),
    public: ['website/'],
  })
  expect(firstUrl(renderToStaticMarkup(<Image src="website/hero.jpg" alt="Hero" />)).hostname).toBe(
    'explicit-app.tlcdn.com',
  )
})
