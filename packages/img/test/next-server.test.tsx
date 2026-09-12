// @vitest-environment happy-dom

import type { ReactNode } from 'react'

import { parseSmartCdnUrl } from '@transloadit/utils/node'
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { connection } = vi.hoisted(() => ({ connection: vi.fn(async () => undefined) }))

vi.mock('next/server.js', () => ({ connection }))
vi.mock('server-only', () => ({}))

import {
  createPrivateStorageImages,
  createTransloaditImage,
  createTransloaditImageFromEnv,
} from '../src/next/server.tsx'

const authSecret = 'never-render-this-secret'
const baseConfiguration = {
  authKey: 'auth-key',
  authSecret,
  baseUrl: 'https://cdn.example/file/{workspace}',
  storage: { allowedPathPrefixes: ['documents/'] },
  workspace: 'my-app',
}

async function renderAsync(node: ReactNode): Promise<string> {
  const stream = await renderToReadableStream(node)
  await stream.allReady
  return new Response(stream).text()
}

function parseMarkup(markup: string): Document {
  return new DOMParser().parseFromString(markup, 'text/html')
}

function getFirstCandidate(document: Document): string {
  const sourceSet = document.querySelector('source')?.getAttribute('srcset')
  if (sourceSet === undefined || sourceSet === null) throw new Error('Expected an image source set')
  const separator = sourceSet.indexOf(' ')
  if (separator === -1) throw new Error('Expected a width descriptor')
  return sourceSet.slice(0, separator)
}

function getStorageRouteCandidate(): {
  authorize: ReturnType<typeof vi.fn>
  storageRoute: (request: Request) => Promise<Response>
  url: URL
} {
  const authorize = vi.fn(
    ({ path, request }: { path: string; request: Request }): boolean =>
      path === 'documents/report.pdf' && request.headers.get('authorization') === 'Bearer allowed',
  )
  const { StorageImage: Image, storageRoute } = createTransloaditImage({
    ...baseConfiguration,
    storage: {
      allowedPathPrefixes: ['documents/'],
      delivery: { authorize, route: '/api/private-images' },
    },
  })
  const markup = renderToStaticMarkup(
    <Image
      alt="Report preview"
      height={600}
      sizes="(min-width: 800px) 640px, 100vw"
      src="documents/report.pdf"
      width={800}
    />,
  )
  return {
    authorize,
    storageRoute,
    url: new URL(getFirstCandidate(parseMarkup(markup)), 'https://app.example'),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime('2029-01-01T12:02:00.000Z')
  connection.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('development delivery diagnostics', () => {
  test('does not call a redirecting origin a failed image delivery', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 307, headers: { Location: 'https://cdn.example/image' } }),
    )
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    await renderAsync(
      <StorageImage alt="Hero" src={{ path: 'documents/hero.jpg', width: 400, height: 300 }} />,
    )
    expect(fetch).toHaveBeenCalledOnce()
    expect(console.warn).not.toHaveBeenCalled()
  })
  test('explains denied route boundaries with static, deduplicated reasons only', async () => {
    const { storageRoute, url } = getStorageRouteCandidate()
    const wrongRoute = new URL(url)
    wrongRoute.pathname = '/wrong-route'
    expect((await storageRoute(new Request(wrongRoute))).status).toBe(404)
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('route/basePath'))
    const malformed = new URL(url)
    malformed.searchParams.set('cap', 'secret-sentinel')
    expect((await storageRoute(new Request(malformed))).status).toBe(404)
    expect((await storageRoute(new Request(malformed))).status).toBe(404)
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/secret.*template/))
    expect(console.warn).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('secret-sentinel')
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(url.href)
    expect(fetch).not.toHaveBeenCalled()
  })

  test('explains direct rendering once per integration, without logging credentials or URLs', async () => {
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    const props = { alt: 'Hero', src: { path: 'documents/hero.jpg', width: 400, height: 300 } }
    await renderAsync(<StorageImage {...props} />)
    await renderAsync(<StorageImage {...props} />)
    expect(console.info).toHaveBeenCalledExactlyOnceWith(
      'StorageImage (direct) makes this route dynamic; use redirect delivery for static pages',
    )
  })

  test('a slow diagnostic cannot consume the direct image grant lifetime', async () => {
    vi.mocked(fetch).mockImplementation(() => {
      vi.setSystemTime(Date.now() + 5000)
      return Promise.resolve(new Response(null, { headers: { 'Content-Type': 'image/jpeg' } }))
    })
    const { StorageImage } = createTransloaditImage({
      ...baseConfiguration,
      storage: { ...baseConfiguration.storage, expiresInMs: 1000, rotationIntervalMs: 1000 },
    })
    const document = parseMarkup(
      await renderAsync(
        <StorageImage
          alt="Preview"
          src={{ path: 'documents/hero.jpg', width: 400, height: 300 }}
        />,
      ),
    )
    expect(Number(new URL(getFirstCandidate(document)).searchParams.get('exp'))).toBeGreaterThan(
      Date.now(),
    )
  })

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { headers: { 'Content-Type': 'image/jpeg' } })),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  test('checks one HEAD per path/template per configured integration', async () => {
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    const props = { alt: 'Preview', src: { path: 'documents/hero.jpg', width: 400, height: 300 } }
    await Promise.all([
      renderAsync(<StorageImage {...props} />),
      renderAsync(<StorageImage {...props} widths={[100]} />),
    ])
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'HEAD',
        redirect: 'manual',
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    )
    expect(console.warn).not.toHaveBeenCalled()
    const other = createTransloaditImage({ ...baseConfiguration, template: 'another-preview' })
    await renderAsync(<other.StorageImage {...props} />)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('never probes from production rendering', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    await renderAsync(
      <StorageImage alt="Preview" src={{ path: 'documents/hero.jpg', width: 400, height: 300 }} />,
    )
    expect(fetch).not.toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
  })

  test.each([
    { status: 403, hint: /Smart CDN-enabled Auth Key.*workspace.*signature/ },
    { status: 404, hint: /workspace slug.*Storage path.*Template/ },
    { status: 500, hint: /HTTP 500.*retry/ },
  ])('gives actionable, non-secret hints for HTTP $status without guessing the cause', async ({
    status,
    hint,
  }) => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(authSecret, { status, headers: { 'x-secret': authSecret } }),
    )
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    const props = { alt: 'Preview', src: { path: 'documents/hero.jpg', width: 400, height: 300 } }
    await renderAsync(<StorageImage {...props} />)
    await renderAsync(<StorageImage {...props} />)
    expect(console.warn).toHaveBeenCalledOnce()
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(hint))
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(authSecret)
    expect(fetch).toHaveBeenCalledOnce()
  })

  test('sanitizes network failures while preserving native rendering', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error(`Failed at secret URL ${authSecret}`))
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    const markup = await renderAsync(
      <StorageImage alt="Preview" src={{ path: 'documents/hero.jpg', width: 400, height: 300 }} />,
    )
    expect(markup).toContain('<picture>')
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('reach Smart CDN'))
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(authSecret)
  })

  test('never diagnoses an unauthorized redirect or a path outside policy', async () => {
    const authorize = vi.fn(() => false)
    const { StorageImage, storageRoute } = createTransloaditImage({
      ...baseConfiguration,
      storage: { ...baseConfiguration.storage, delivery: { route: '/images', authorize } },
    })
    expect(() =>
      StorageImage({ alt: 'Denied', src: { path: 'private/hero.jpg', width: 400, height: 300 } }),
    ).toThrow(/allowed prefixes/)
    const document = parseMarkup(
      renderToStaticMarkup(
        <StorageImage
          alt="Preview"
          src={{ path: 'documents/hero.jpg', width: 400, height: 300 }}
        />,
      ),
    )
    const request = new Request(new URL(getFirstCandidate(document), 'https://app.example'))
    expect((await storageRoute(request)).status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
    authorize.mockReturnValue(true)
    expect((await storageRoute(request)).status).toBe(307)
    expect(fetch).toHaveBeenCalledOnce()
  })
})

describe('createTransloaditImageFromEnv', () => {
  test.each([
    'direct',
    'redirect',
  ])('binds transparent candidates and the configured JPEG background through %s delivery', async (delivery) => {
    const integration =
      delivery === 'direct'
        ? createTransloaditImage(baseConfiguration)
        : createTransloaditImage({
            ...baseConfiguration,
            storage: {
              allowedPathPrefixes: ['documents/'],
              delivery: { route: '/images', authorize: () => true },
            },
          })
    const document = parseMarkup(
      await renderAsync(
        <integration.StorageImage
          alt="Transparent logo"
          src={{ path: 'documents/logo.png', width: 64, height: 64 }}
          fallbackBackground="#224466"
        />,
      ),
    )
    const candidate = getFirstCandidate(document)
    const fallback = document.querySelector('img')?.getAttribute('src')
    if (fallback == null) throw new Error('Expected a JPEG fallback')
    for (const [source, bg] of [
      [candidate, '#00000000'],
      [fallback, '#224466'],
    ]) {
      if (source === undefined) throw new Error('Expected a candidate URL')
      const location =
        'storageRoute' in integration
          ? (
              await integration.storageRoute(new Request(new URL(source, 'https://app.example')))
            ).headers.get('location')
          : source
      if (location === null) throw new Error('Expected a redirect')
      expect(
        parseSmartCdnUrl(location, {
          baseUrl: baseConfiguration.baseUrl,
          workspace: baseConfiguration.workspace,
        }).urlParams.bg,
      ).toBe(bg)
      expect(new URL(location).hash).toBe('')
      expect(location).toContain('bg=%23')
    }
  })

  test('rejects a global background override before it can flatten alpha or make JPEG transparent', () => {
    expect(() =>
      createTransloaditImage({
        ...baseConfiguration,
        urlParams: { bg: '#00000000' },
      }),
    ).toThrow(/image policy parameter: bg/)
  })

  test('layout defaults leave explicit sizes, widths and styles in control', async () => {
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    const document = parseMarkup(
      await renderAsync(
        <StorageImage
          alt="Override"
          src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
          layout="constrained"
          maxWidth={960}
          widths={[2400]}
          sizes="50vw"
          style={{ maxWidth: 1200 }}
        />,
      ),
    )
    expect(document.querySelector('source')?.sizes).toBe('50vw')
    expect(document.querySelector('source')?.srcset).toContain('2400w')
    expect(document.querySelector('img')?.style.maxWidth).toBe('1200px')
  })

  test.each<'fixed' | 'fill'>([
    'fixed',
    'fill',
  ])('explains that %s layout needs receipt geometry rather than a string source', (layout) => {
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    expect(() =>
      // @ts-expect-error JavaScript callers can pass a string where fixed layout requires a receipt.
      StorageImage({
        alt: 'Avatar',
        src: 'documents/avatar.jpg',
        layout,
        width: 48,
        height: 48,
      }),
    ).toThrow(`${layout} layout requires a receipt source`)
    expect(connection).not.toHaveBeenCalled()
  })

  test.each([
    { layout: 'fixed', width: 0, height: 48 },
    { layout: 'constrained', maxWidth: Number.NaN },
    { layout: 'fill', fit: 'cover' },
    { layout: 'fill', fit: 'cover', aspectRatio: '9/0' },
    { layout: 'fixed', width: 48, height: 48, fit: 'stretch' },
    { layout: 'other' },
  ])('rejects invalid layout before rendering %j', (layout) => {
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    expect(() =>
      Reflect.apply(StorageImage, undefined, [
        {
          alt: 'Invalid',
          src: { path: 'documents/hero.jpg', width: 400, height: 300 },
          ...layout,
        },
      ]),
    ).toThrow()
    expect(connection).not.toHaveBeenCalled()
  })

  test('derives constrained layout and caps its candidates at twice maxWidth', async () => {
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    const document = parseMarkup(
      await renderAsync(
        <StorageImage
          alt="Hero"
          src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
          layout="constrained"
          maxWidth={960}
        />,
      ),
    )
    const image = document.querySelector('img')
    expect(image?.style.cssText).toBe(
      'display: block; max-width: 960px; width: 100%; height: auto;',
    )
    expect(image?.getAttribute('width')).toBe('2400')
    const source = document.querySelector('source')
    expect(source?.sizes).toBe('auto, (min-width: 960px) 960px, 100vw')
    expect(source?.srcset).toContain('1920w')
    expect(source?.srcset).not.toContain('2400w')
  })

  test('fixed cover uses receipt geometry for a signed 48px crop and a 1x JPEG fallback', async () => {
    const { StorageImage, storageRoute } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        ...baseConfiguration.storage,
        delivery: { route: '/images', authorize: () => true },
      },
    })
    const document = parseMarkup(
      renderToStaticMarkup(
        <StorageImage
          alt="Avatar"
          src={{ path: 'documents/avatar.jpg', width: 400, height: 300 }}
          layout="fixed"
          width={48}
          height={48}
          fit="cover"
        />,
      ),
    )
    const image = document.querySelector('img')
    expect(image?.getAttribute('width')).toBe('48')
    expect(image?.getAttribute('height')).toBe('48')
    expect(document.querySelector('source')?.sizes).toBe('48px')
    expect(document.querySelector('source')?.srcset).toContain('96w')
    expect(document.querySelector('source')?.srcset).not.toContain('400w')
    const response = await storageRoute(
      new Request(new URL(image?.getAttribute('src') ?? '', 'https://app.example')),
    )
    const target = parseSmartCdnUrl(response.headers.get('location') ?? '', {
      baseUrl: baseConfiguration.baseUrl,
    })
    expect(target.urlParams).toMatchObject({ r: 'fillcrop', w: '48', h: '48', f: 'jpg' })
  })

  test('fill cover signs the declared box ratio and retains explicit layout overrides', async () => {
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    const document = parseMarkup(
      await renderAsync(
        <StorageImage
          alt="Portrait crop"
          src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
          layout="fill"
          fit="cover"
          aspectRatio="9/16"
          sizes="100vw"
          widths={[390, 780]}
          style={{ position: 'relative' }}
        />,
      ),
    )
    expect(document.querySelector('img')?.style.position).toBe('relative')
    expect(document.querySelector('img')?.style.width).toBe('100%')
    expect(document.querySelector('source')?.sizes).toBe('100vw')
    const target = parseSmartCdnUrl(getFirstCandidate(document), {
      baseUrl: baseConfiguration.baseUrl,
    })
    expect(target.urlParams).toMatchObject({ r: 'fillcrop', w: '390', h: '693' })
  })

  test('exports an unambiguous StorageImage component', () => {
    const integration = createTransloaditImage(baseConfiguration)
    expect(integration.StorageImage).toBeTypeOf('function')
    expect(Object.keys(integration)).toEqual(['StorageImage'])
  })

  beforeEach(() => {
    vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', baseConfiguration.authKey)
    vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', baseConfiguration.authSecret)
    vi.stubEnv('TRANSLOADIT_WORKSPACE', baseConfiguration.workspace)
  })

  afterEach(() => vi.unstubAllEnvs())

  test('snapshots rendering environment once and delegates to the explicit factory', async () => {
    const { StorageImage: Image } = createTransloaditImageFromEnv({
      baseUrl: baseConfiguration.baseUrl,
      storage: baseConfiguration.storage,
    })
    const { StorageImage: ExplicitImage } = createTransloaditImage(baseConfiguration)
    vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'changed-key')
    vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', 'changed-secret')
    vi.stubEnv('TRANSLOADIT_WORKSPACE', 'changed-workspace')
    const props = {
      alt: 'Snapshot',
      src: { path: 'documents/report.pdf', width: 400, height: 300 },
    }
    const actual = parseMarkup(await renderAsync(Image(props)))
    const expected = parseMarkup(await renderAsync(ExplicitImage(props)))
    expect(actual.querySelector('picture')?.isEqualNode(expected.querySelector('picture'))).toBe(
      true,
    )
    expect(actual.documentElement.outerHTML).not.toContain(authSecret)
    expect(actual.documentElement.outerHTML).not.toContain('changed-')
  })

  test.each(
    ['TRANSLOADIT_SMART_CDN_KEY', 'TRANSLOADIT_SMART_CDN_SECRET', 'TRANSLOADIT_WORKSPACE'].flatMap(
      (name) =>
        [undefined, '', '   ', ' secret-with-whitespace '].map((value) => ({ name, value })),
    ),
  )('rejects missing or invalid $name without exposing its value', ({ name, value }) => {
    vi.stubEnv(name, value)
    expect(() =>
      createTransloaditImageFromEnv({ storage: baseConfiguration.storage }),
    ).toThrowError(
      new TypeError(`${name} must be a non-empty string without surrounding whitespace`),
    )
  })

  test('never falls back to Assembly credentials or changes the explicit factory', () => {
    vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', undefined)
    vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', undefined)
    vi.stubEnv('TRANSLOADIT_ASSEMBLY_KEY', 'write-key')
    vi.stubEnv('TRANSLOADIT_ASSEMBLY_SECRET', 'write-secret')
    vi.stubEnv('TRANSLOADIT_KEY', 'legacy-key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'legacy-secret')
    expect(() => createTransloaditImageFromEnv({ storage: baseConfiguration.storage })).toThrow(
      'TRANSLOADIT_SMART_CDN_KEY',
    )
    expect(() => createTransloaditImage(baseConfiguration)).not.toThrow()
  })

  test('still requires explicit storage and retains deny-all without path prefixes', () => {
    expect(() => Reflect.apply(createTransloaditImageFromEnv, undefined, [{}])).toThrow(/storage/)
    const { StorageImage: Image } = createTransloaditImageFromEnv({
      storage: { allowedPathPrefixes: [] },
    })
    expect(() =>
      Image({ alt: 'Denied', src: { path: 'documents/report.pdf', width: 400, height: 300 } }),
    ).toThrow('outside the configured allowed prefixes')
    expect(connection).not.toHaveBeenCalled()
  })

  test.each([
    { cacheMaxAgeMs: 10_999, expected: 'private, max-age=10' },
    { cacheMaxAgeMs: 999, expected: 'private, no-store' },
    { cacheMaxAgeMs: 120_000, expected: 'private, max-age=30' },
  ])('bounds opt-in redirect caching ($cacheMaxAgeMs ms)', async ({ cacheMaxAgeMs, expected }) => {
    const delivery = { authorize: vi.fn(() => true), cacheMaxAgeMs, route: '/images' }
    const { StorageImage: Image, storageRoute } = createTransloaditImage({
      ...baseConfiguration,
      storage: { ...baseConfiguration.storage, delivery, rotationIntervalMs: 30_000 },
    })
    delivery.cacheMaxAgeMs = 1
    const document = parseMarkup(
      renderToStaticMarkup(
        <Image alt="Report" src={{ path: 'documents/report.pdf', width: 400, height: 300 }} />,
      ),
    )
    const request = new Request(new URL(getFirstCandidate(document), 'https://app.example'))
    const response = await storageRoute(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('Cache-Control')).toBe(expected)
    delivery.authorize.mockReturnValue(false)
    const denied = await storageRoute(request)
    expect(denied.status).toBe(404)
    expect(denied.headers.get('Cache-Control')).toBe('private, no-store')
  })

  test.each([
    -1,
    0,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1.5,
  ])('rejects invalid redirect cache duration %s', (cacheMaxAgeMs) => {
    expect(() =>
      createTransloaditImage({
        ...baseConfiguration,
        storage: {
          ...baseConfiguration.storage,
          delivery: { authorize: () => true, cacheMaxAgeMs, route: '/images' },
        },
      }),
    ).toThrow('cacheMaxAgeMs must be a positive safe integer')
  })

  test.each(
    [undefined, null, false, 'documents/', []].map((storage) => ({ storage })),
  )('rejects invalid explicit storage $storage', ({ storage }) => {
    expect(() =>
      Reflect.apply(createTransloaditImageFromEnv, undefined, [{ storage }]),
    ).toThrowError(new TypeError('storage must be an explicit configuration object'))
  })

  test('retains trusted template, transport and authorization settings for redirect delivery', async () => {
    const authorize = vi.fn(() => true)
    const { StorageImage: Image, storageRoute } = createTransloaditImageFromEnv({
      baseUrl: baseConfiguration.baseUrl,
      template: 'website/preview',
      urlParams: { cdn: 'required' },
      storage: {
        allowedPathPrefixes: ['documents/'],
        delivery: { route: '/images', basePath: '/app', authorize },
      },
    })
    const document = parseMarkup(
      renderToStaticMarkup(
        Image({ alt: 'Report', src: { path: 'documents/report.pdf', width: 400, height: 300 } }),
      ),
    )
    const url = new URL(getFirstCandidate(document), 'https://app.example')
    expect(url.pathname).toBe('/app/images')
    expect(connection).not.toHaveBeenCalled()
    const response = await storageRoute(new Request(url))
    expect(response.status).toBe(307)
    expect(authorize).toHaveBeenCalledOnce()
    const location = response.headers.get('location')
    if (location === null) throw new Error('Expected an authorized CDN target')
    const candidate = parseSmartCdnUrl(location, baseConfiguration)
    expect(candidate.template).toBe('website/preview')
    expect(candidate.urlParams.cdn).toBe('required')
    expect(candidate.input).toBe('documents/report.pdf')
  })
})

describe('createTransloaditImage', () => {
  test('infers the Next basePath while preserving an explicit override', () => {
    vi.stubEnv('__NEXT_ROUTER_BASEPATH', '/inferred')
    try {
      const { url } = getStorageRouteCandidate()
      expect(url.pathname).toBe('/inferred/api/private-images')
      const { StorageImage } = createTransloaditImage({
        ...baseConfiguration,
        storage: {
          ...baseConfiguration.storage,
          delivery: { authorize: () => true, route: '/images', basePath: '/explicit' },
        },
      })
      expect(
        getFirstCandidate(
          parseMarkup(
            renderToStaticMarkup(
              <StorageImage
                alt="Base path"
                src={{ path: 'documents/hero.jpg', width: 400, height: 300 }}
              />,
            ),
          ),
        ),
      ).toMatch(/^\/explicit\/images\?/)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  test('renders real per-breakpoint crops with a JPEG fallback for each art direction', () => {
    const { StorageImage } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        ...baseConfiguration.storage,
        delivery: { authorize: () => true, route: '/images' },
      },
    })
    const document = parseMarkup(
      renderToStaticMarkup(
        <StorageImage
          alt="Art-directed hero"
          src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
          layout="fill"
          fit="cover"
          aspectRatio={{ '(max-width: 639px)': '9/16', default: '16/9' }}
          widths={[320, 640]}
          preload
        />,
      ),
    )
    expect(document.querySelectorAll('source[media="(max-width: 639px)"]')).toHaveLength(3)
    expect(document.querySelectorAll('source:not([media])')).toHaveLength(2)
    expect(document.querySelector('source[media][type="image/jpeg"]')).not.toBeNull()
    const preloads = document.querySelectorAll('link[rel="preload"]')
    expect(preloads).toHaveLength(2)
    expect(document.querySelector('picture link')).toBeNull()
    expect(preloads[0]?.getAttribute('media')).toBe('(max-width: 639px)')
    expect(preloads[1]?.getAttribute('media')).toBe('not ((max-width: 639px))')
  })

  test.each<['lazy' | 'eager', string]>([
    ['lazy', 'auto, (min-width: 960px) 960px, 100vw'],
    ['eager', '(min-width: 960px) 960px, 100vw'],
  ])('derives %s constrained sizes without overestimating narrow columns', (loading, sizes) => {
    const { StorageImage } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        ...baseConfiguration.storage,
        delivery: { authorize: () => true, route: '/images' },
      },
    })
    const document = parseMarkup(
      renderToStaticMarkup(
        <StorageImage
          alt="Column"
          src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
          layout="constrained"
          maxWidth={960}
          loading={loading}
        />,
      ),
    )
    expect(document.querySelector('source')?.getAttribute('sizes')).toBe(sizes)
  })

  test('a receipt keeps intrinsic signing geometry while explicit dimensions describe presentation', async () => {
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    const document = parseMarkup(
      await renderAsync(
        <StorageImage
          alt="Sized receipt"
          src={{ path: 'documents/hero.jpg', width: 2400, height: 1600 }}
          width={480}
          height={320}
        />,
      ),
    )
    expect(document.querySelector('img')?.getAttribute('width')).toBe('480')
    expect(document.querySelector('img')?.getAttribute('height')).toBe('320')
    const fallback = document.querySelector('img')?.getAttribute('src')
    if (!fallback) throw new Error('Expected fallback')
    expect(new URL(fallback).searchParams.get('w')).toBe('2400')
  })

  test('public prefixes bypass authorization only for their exact directory and bound shared cache freshness', async () => {
    const authorize = vi.fn(() => false)
    const delivery = { authorize, public: ['documents/public/'], route: '/images' }
    const { StorageImage, storageRoute } = createTransloaditImage({
      ...baseConfiguration,
      storage: { allowedPathPrefixes: ['documents/'], delivery },
    })
    delivery.public.push('documents/private/')
    const candidate = (path: string): Request =>
      new Request(
        new URL(
          getFirstCandidate(
            parseMarkup(
              renderToStaticMarkup(
                <StorageImage alt="Preview" src={{ path, width: 400, height: 300 }} />,
              ),
            ),
          ),
          'https://app.example',
        ),
      )
    const response = await storageRoute(candidate('documents/public/hero.jpg'))
    expect(response.status).toBe(307)
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=60',
    )
    expect(authorize).not.toHaveBeenCalled()
    const denied = await storageRoute(candidate('documents/private/hero.jpg'))
    expect(denied.status).toBe(404)
    expect(denied.headers.get('cache-control')).toBe('private, no-store')
    expect((await storageRoute(candidate('documents/publicity/hero.jpg'))).status).toBe(404)
    expect(authorize).toHaveBeenCalledTimes(2)
    vi.setSystemTime('2029-01-01T12:59:59.000Z')
    expect(
      (await storageRoute(candidate('documents/public/hero.jpg'))).headers.get('cache-control'),
    ).toBe('public, max-age=0, s-maxage=3541, stale-while-revalidate=60')
  })

  test('rejects public prefixes outside the signing policy', () => {
    expect(() =>
      createTransloaditImage({
        ...baseConfiguration,
        storage: {
          allowedPathPrefixes: ['documents/'],
          delivery: { route: '/images', authorize: () => true, public: ['documents'] },
        },
      }),
    ).toThrow('storage.delivery.public[0]')
    expect(() =>
      createTransloaditImage({
        ...baseConfiguration,
        storage: {
          ...baseConfiguration.storage,
          delivery: { route: '/images', authorize: () => true, public: ['other/'] },
        },
      }),
    ).toThrow(/public.*allowedPathPrefixes/)
  })

  test('accepts old template markup only until an absolute migration deadline and still authorizes', async () => {
    const authorize = vi.fn(() => true)
    const storage = { ...baseConfiguration.storage, delivery: { route: '/images', authorize } }
    const old = createTransloaditImage({
      ...baseConfiguration,
      template: 'builtin/storage-preview@0.0.1',
      storage,
    })
    const url = new URL(
      getFirstCandidate(
        parseMarkup(
          renderToStaticMarkup(
            <old.StorageImage
              alt="Old preview"
              src={{ path: 'documents/hero.jpg', width: 400, height: 300 }}
            />,
          ),
        ),
      ),
      'https://app.example',
    )
    const until = Date.now() + 60_000
    const current = createTransloaditImage({
      ...baseConfiguration,
      storage,
      previousTemplatesUntil: until,
    })
    const response = await current.storageRoute(new Request(url))
    expect(response.status).toBe(307)
    expect(decodeURIComponent(response.headers.get('location') ?? '')).toContain(
      'builtin/storage-preview@0.0.1',
    )
    authorize.mockReturnValue(false)
    expect((await current.storageRoute(new Request(url))).status).toBe(404)
    authorize.mockReturnValue(true)
    const revoked = createTransloaditImage({
      ...baseConfiguration,
      storage,
      previousTemplatesUntil: until,
      previousTemplates: [],
    })
    expect((await revoked.storageRoute(new Request(url))).status).toBe(404)
    const rotated = createTransloaditImage({
      ...baseConfiguration,
      storage,
      authSecret: 'rotated',
      previousTemplatesUntil: until,
    })
    expect((await rotated.storageRoute(new Request(url))).status).toBe(404)
    vi.setSystemTime(until)
    expect((await current.storageRoute(new Request(url))).status).toBe(404)
    const restarted = createTransloaditImage({
      ...baseConfiguration,
      storage,
      previousTemplatesUntil: until,
    })
    expect((await restarted.storageRoute(new Request(url))).status).toBe(404)
  })

  test('rejects unbounded explicit template migrations', () => {
    expect(() =>
      createTransloaditImage({ ...baseConfiguration, previousTemplates: ['old-preview'] }),
    ).toThrow(/previousTemplatesUntil/)
  })

  test('the named private factory uses rendering env, redirects and a single lifetime knob', async () => {
    vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', baseConfiguration.authKey)
    vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', baseConfiguration.authSecret)
    vi.stubEnv('TRANSLOADIT_WORKSPACE', baseConfiguration.workspace)
    try {
      const { StorageImage, storageRoute } = createPrivateStorageImages({
        allowedPathPrefixes: ['documents/'],
        authorize: () => true,
        lifetime: 600_000,
      })
      const url = new URL(
        getFirstCandidate(
          parseMarkup(
            renderToStaticMarkup(
              <StorageImage
                alt="Private"
                src={{ path: 'documents/hero.jpg', width: 400, height: 300 }}
              />,
            ),
          ),
        ),
        'https://app.example',
      )
      expect(url.pathname).toBe('/api/storage-images')
      const response = await storageRoute(new Request(url))
      const location = response.headers.get('location')
      expect(response.status).toBe(307)
      expect(location).not.toBeNull()
      if (location === null) throw new Error('Expected CDN location')
      expect(new URL(location).searchParams.get('exp')).toBe(
        String(Date.parse('2029-01-01T12:20:00Z')),
      )
      expect(connection).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  test('rejects a missing prefix policy at factory time for untyped callers', () => {
    expect(() =>
      Reflect.apply(createTransloaditImage, undefined, [{ ...baseConfiguration, storage: {} }]),
    ).toThrow('storage.allowedPathPrefixes is required')
  })

  test('exports only the named StorageImage component, not the unpublished Image alias', () => {
    expect(Object.keys(createTransloaditImage(baseConfiguration))).toEqual(['StorageImage'])
  })

  test('shares CDN URLs throughout the default expiry bucket, then rotates at its boundary', async () => {
    const { StorageImage } = createTransloaditImage(baseConfiguration)
    const render = async (): Promise<string> =>
      getFirstCandidate(
        parseMarkup(
          await renderAsync(
            <StorageImage
              alt="Hourly preview"
              src={{ path: 'documents/hero.jpg', width: 400, height: 300 }}
            />,
          ),
        ),
      )
    const first = await render()
    vi.setSystemTime('2029-01-01T12:59:59.999Z')
    expect(await render()).toBe(first)
    vi.setSystemTime('2029-01-01T13:00:00.000Z')
    expect(await render()).not.toBe(first)
  })

  test('shares redirect targets throughout the default expiry bucket while still authorizing', async () => {
    const { authorize, storageRoute, url } = getStorageRouteCandidate()
    const request = new Request(url, { headers: { Authorization: 'Bearer allowed' } })
    const first = await storageRoute(request)
    vi.setSystemTime('2029-01-01T12:59:59.999Z')
    expect((await storageRoute(request)).headers.get('location')).toBe(
      first.headers.get('location'),
    )
    expect(authorize).toHaveBeenCalledTimes(2)
  })

  test.each([
    'direct',
    'redirect',
  ])('renders a receipt exactly like its string equivalent with %s delivery', async (delivery) => {
    const { StorageImage: Image } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        ...baseConfiguration.storage,
        delivery: delivery === 'direct' ? 'direct' : { route: '/images', authorize: () => true },
      },
    })
    const src = {
      path: 'documents/report.pdf',
      width: 400,
      height: 300,
      asset_id: 'private-asset-id',
      md5hash: 'private-checksum',
      authSecret: 'secret-from-receipt',
      id: 'not-an-attribute',
    }
    const received = parseMarkup(await renderAsync(Image({ alt: 'Report', src })))
    const expected = parseMarkup(
      await renderAsync(Image({ alt: 'Report', src: src.path, width: 400, height: 300 })),
    )
    expect(received.querySelector('picture')?.isEqualNode(expected.querySelector('picture'))).toBe(
      true,
    )
    expect(received.querySelector('img')?.getAttribute('width')).toBe('400')
    expect(received.querySelector('img')?.getAttribute('height')).toBe('300')
    expect(received.documentElement.outerHTML).not.toContain('private-asset-id')
    expect(received.documentElement.outerHTML).not.toContain('private-checksum')
    expect(received.documentElement.outerHTML).not.toContain('secret-from-receipt')
    expect(received.querySelector('img')?.id).toBe('')
  })

  test.each(
    [
      null,
      [],
      {},
      { toString: () => 'documents/report.pdf' },
      { path: 'documents/../secret.pdf', width: 400, height: 300 },
      { path: 'private/report.pdf', width: 400, height: 300 },
      { path: 'documents/report.pdf', width: '400', height: 300 },
      { path: 'documents/report.pdf', width: 0, height: 300 },
      { path: 'documents/report.pdf', width: 400, height: 1.5 },
      { path: 'documents/report.pdf', width: 400, height: Number.POSITIVE_INFINITY },
      { path: 'documents/report.pdf', width: Number.MAX_SAFE_INTEGER + 1, height: 300 },
    ].map((src) => ({ src })),
  )('rejects malformed or unauthorized receipt $src before request I/O', ({ src }) => {
    const { StorageImage: Image } = createTransloaditImage(baseConfiguration)
    expect(() => Reflect.apply(Image, undefined, [{ alt: 'Invalid', src }])).toThrow()
    expect(connection).not.toHaveBeenCalled()
  })

  test('rejects invalid presentation dimensions from JavaScript callers', () => {
    const { StorageImage: Image } = createTransloaditImage(baseConfiguration)
    expect(() =>
      Reflect.apply(Image, undefined, [
        {
          alt: 'Ambiguous',
          src: { path: 'documents/report.pdf', width: 400, height: 300 },
          width: -1,
          height: 300,
        },
      ]),
    ).toThrow()
    expect(connection).not.toHaveBeenCalled()
  })

  test('snapshots receipt geometry and path before request-time mutation', async () => {
    const { StorageImage: Image } = createTransloaditImage(baseConfiguration)
    const src = { path: 'documents/report.pdf', width: 400, height: 300 }
    connection.mockImplementationOnce(() => {
      Object.assign(src, { path: 'private/changed.pdf', width: 0, height: 0 })
      return Promise.resolve(undefined)
    })
    const document = parseMarkup(
      await renderAsync(Image({ alt: 'Stable receipt', src, widths: [400] })),
    )
    const url = parseSmartCdnUrl(getFirstCandidate(document), baseConfiguration)
    expect(url.input).toBe('documents/report.pdf')
    expect(url.urlParams).toMatchObject({ h: '300', w: '400' })
    expect(document.querySelector('img')?.getAttribute('width')).toBe('400')
  })

  test.each([
    'string',
    'receipt',
  ])('snapshots %s dimensions before reading other attributes in redirect delivery', async (kind) => {
    const { StorageImage: Image, storageRoute } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        ...baseConfiguration.storage,
        delivery: { route: '/images', authorize: () => true },
      },
    })
    const source = { path: 'documents/report.pdf', width: 400, height: 300 }
    const props = {
      alt: 'Stable redirect',
      src: source.path,
      width: 400,
      height: 300,
      widths: [400],
    }
    const sourceProps = kind === 'string' ? props : { alt: props.alt, src: source, widths: [400] }
    Object.defineProperty(sourceProps, 'id', {
      enumerable: true,
      get() {
        Object.assign(source, { path: 'private/changed.pdf', width: 0, height: 0 })
        props.width = 0
        props.height = 0
        return 'original-id'
      },
    })
    const markup = renderToStaticMarkup(Image(sourceProps))
    const document = parseMarkup(markup)
    const response = await storageRoute(
      new Request(new URL(getFirstCandidate(document), 'https://app.example')),
    )
    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    if (location === null) throw new Error('Expected an authorized CDN target')
    const candidate = parseSmartCdnUrl(location, baseConfiguration)
    expect(candidate.input).toBe('documents/report.pdf')
    expect(candidate.urlParams).toMatchObject({ h: '300', w: '400' })
    expect(document.querySelector('img')?.getAttribute('width')).toBe('400')
    expect(connection).not.toHaveBeenCalled()
  })

  test('reserves native image geometry while request-time signing is suspended', async () => {
    let resolveConnection: (value: undefined) => void = () => {
      throw new Error('Connection was not initialized')
    }
    const pending = new Promise<undefined>((resolve) => {
      resolveConnection = resolve
    })
    connection.mockImplementationOnce(() => pending)
    const { StorageImage: Image } = createTransloaditImage(baseConfiguration)
    const stream = await renderToReadableStream(
      <main>
        <Image
          alt="Hero"
          aria-describedby="hero-caption"
          aria-labelledby="hero hero-caption"
          className="hero"
          id="hero"
          preload
          sizes="(min-width: 960px) 960px, 100vw"
          src={{ path: 'documents/hero.jpg', height: 1600, width: 2400 }}
          style={{ display: 'block', height: 'auto', maxWidth: 960, width: '100%' }}
        />
        <p>Following content</p>
      </main>,
    )
    const reader = stream.getReader()
    const shell = new TextDecoder().decode((await reader.read()).value)
    const placeholder = parseMarkup(shell).querySelector('img')
    // Always resolve the request so a failed assertion cannot leak a suspended stream.
    resolveConnection(undefined)
    await stream.allReady
    let remaining = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      remaining += new TextDecoder().decode(value)
    }
    const image = parseMarkup(remaining).getElementById('hero')

    expect(placeholder?.hasAttribute('id')).toBe(false)
    expect(placeholder?.hasAttribute('aria-describedby')).toBe(false)
    expect(placeholder?.hasAttribute('aria-labelledby')).toBe(false)
    expect(image?.getAttribute('id')).toBe('hero')
    expect(image?.getAttribute('aria-describedby')).toBe('hero-caption')
    expect(image?.getAttribute('aria-labelledby')).toBe('hero hero-caption')
    expect(placeholder?.getAttribute('width')).toBe('2400')
    expect(placeholder?.getAttribute('height')).toBe('1600')
    expect(placeholder?.getAttribute('class')).toBe('hero')
    // Consumer selectors such as picture > img must apply before signing resolves too.
    expect(placeholder?.parentElement?.tagName).toBe('PICTURE')
    expect(placeholder?.getAttribute('style')).toBe(
      'display:block;height:auto;max-width:960px;width:100%;visibility:hidden',
    )
    expect(placeholder?.getAttribute('aria-hidden')).toBe('true')
    expect(placeholder?.hasAttribute('inert')).toBe(true)
    expect(placeholder?.hasAttribute('src')).toBe(false)
    expect(shell).not.toContain('cdn.example')
    expect(shell).not.toContain('imageSrcSet')
    expect(shell).toContain('Following content')
    expect(image?.getAttribute('style')).toBe(
      'display:block;height:auto;max-width:960px;width:100%',
    )
    expect(image?.getAttribute('width')).toBe('2400')
    expect(image?.getAttribute('height')).toBe('1600')
    expect(image?.getAttribute('src')).toContain('cdn.example')
  })

  test('keeps an explicit direct Suspense fallback as an override', async () => {
    let resolveConnection: (value: undefined) => void = () => {
      throw new Error('Connection was not initialized')
    }
    const pending = new Promise<undefined>((resolve) => {
      resolveConnection = resolve
    })
    connection.mockImplementationOnce(() => pending)
    const { StorageImage: Image } = createTransloaditImage(baseConfiguration)
    const stream = await renderToReadableStream(
      <main>
        <Image
          alt="Custom shell"
          height={300}
          src="documents/report.pdf"
          suspenseFallback={<p role="status">Custom preview</p>}
          width={400}
        />
        <p>Following content</p>
      </main>,
    )
    const reader = stream.getReader()
    const shell = new TextDecoder().decode((await reader.read()).value)
    resolveConnection(undefined)
    await stream.allReady
    await reader.cancel()

    expect(parseMarkup(shell).querySelector('[role="status"]')?.textContent).toBe('Custom preview')
    expect(parseMarkup(shell).querySelector('img')).toBeNull()
  })

  test('allows explicit widths while making sizes optional', async () => {
    const { StorageImage: Image } = createTransloaditImage(baseConfiguration)
    const document = parseMarkup(
      await renderAsync(
        <Image
          alt="Explicit widths"
          height={600}
          src="documents/report.pdf"
          width={800}
          widths={[200, 400, 800]}
        />,
      ),
    )
    const source = document.querySelector('source')

    expect(source?.getAttribute('sizes')).toBe('auto, 100vw')
    expect(source?.getAttribute('srcset')).toContain('200w')
    expect(source?.getAttribute('srcset')).toContain('400w')
    expect(source?.getAttribute('srcset')).toContain('800w')
  })

  test.each([
    'direct',
    'redirect',
  ])('preserves native attributes and descriptions in %s delivery', async (delivery) => {
    const { StorageImage: Image } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        ...baseConfiguration.storage,
        delivery:
          delivery === 'direct'
            ? 'direct'
            : { authorize: () => true, route: '/api/private-images' },
      },
    })
    const document = parseMarkup(
      await renderAsync(
        <figure>
          <Image
            alt="Report preview"
            aria-describedby="report-caption"
            data-document="report"
            height={600}
            id="report-preview"
            role="img"
            sizes="auto, 100vw"
            src="documents/report.pdf"
            title="Annual report"
            width={800}
          />
          <figcaption id="report-caption">The annual report</figcaption>
        </figure>,
      ),
    )
    const image = document.getElementById('report-preview')
    expect(image?.getAttribute('aria-describedby')).toBe('report-caption')
    expect(
      document.getElementById(image?.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('The annual report')
    expect(image?.getAttribute('title')).toBe('Annual report')
    expect(image?.getAttribute('role')).toBe('img')
    expect(image?.getAttribute('data-document')).toBe('report')
    expect(image?.getAttribute('sizes')).toBe('auto')
  })

  test.each([
    'direct',
    'redirect',
  ])('rejects non-string alt before rendering in %s delivery', (delivery) => {
    const { StorageImage: Image } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        ...baseConfiguration.storage,
        delivery:
          delivery === 'direct'
            ? 'direct'
            : { authorize: () => true, route: '/api/private-images' },
      },
    })
    expect(() =>
      Reflect.apply(Image, undefined, [
        { alt: { text: 'Report' }, height: 600, src: 'documents/report.pdf', width: 800 },
      ]),
    ).toThrow('Image alt must be a string')
  })

  test('rejects coercible Storage sources before signing', () => {
    const { StorageImage: Image } = createTransloaditImage(baseConfiguration)
    const stringConversion = vi.fn(() => 'https://assets.example/photo.jpg')

    expect(() =>
      Reflect.apply(Image, undefined, [
        { alt: 'Coercible', height: 600, src: { toString: stringConversion }, width: 800 },
      ]),
    ).toThrow('Storage image src must be one relative object path')
    expect(stringConversion).not.toHaveBeenCalled()
  })

  test('request-renders direct Storage previews with bounded stable signatures', async () => {
    const { StorageImage: Image } = createTransloaditImage(baseConfiguration)
    const render = async (): Promise<Document> => {
      const markup = await renderAsync(
        <Image
          alt="Preview of report.pdf"
          formats={{ webp: 61 }}
          height={300}
          sizes="400px"
          src="documents/report.pdf"
          width={400}
          widths={[200, 400]}
        />,
      )
      expect(markup).not.toContain(authSecret)
      return parseMarkup(markup)
    }

    const firstDocument = await render()
    const firstSource = new URL(getFirstCandidate(firstDocument))
    const firstFallback = new URL(firstDocument.querySelector('img')?.getAttribute('src') ?? '')

    expect(connection).toHaveBeenCalledOnce()
    expect(firstSource.pathname).toContain('/builtin%2Fstorage-preview%400.0.2/')
    expect(firstSource.searchParams.get('f')).toBe('webp')
    expect(firstSource.searchParams.get('h')).toBe('150')
    expect(firstSource.searchParams.get('q')).toBe('61')
    expect(firstFallback.searchParams.get('f')).toBe('jpg')
    expect(firstDocument.querySelector('img')?.getAttribute('loading')).toBe('lazy')
    expect(firstSource.searchParams.get('exp')).toBe(String(Date.parse('2029-01-01T14:00:00Z')))

    vi.setSystemTime('2029-01-01T12:59:59.999Z')
    const sameWindow = await render()
    expect(sameWindow.querySelector('source')?.getAttribute('srcset')).toBe(
      firstDocument.querySelector('source')?.getAttribute('srcset'),
    )

    vi.setSystemTime('2029-01-01T13:00:00.000Z')
    const nextWindow = await render()
    expect(nextWindow.querySelector('source')?.getAttribute('srcset')).not.toBe(
      firstDocument.querySelector('source')?.getAttribute('srcset'),
    )
  })

  test('denies private paths by default and matches explicit directory boundaries', () => {
    const { StorageImage: denyAllImage } = createTransloaditImage({
      ...baseConfiguration,
      storage: { allowedPathPrefixes: [] },
    })
    const { StorageImage: Image } = createTransloaditImage(baseConfiguration)

    expect(() =>
      denyAllImage({
        alt: 'Denied',
        height: 300,
        src: 'documents/report.pdf',
        width: 400,
      }),
    ).toThrow('outside the configured allowed prefixes')
    expect(() =>
      Image({
        alt: 'Boundary mismatch',
        height: 300,
        src: 'documents-private/report.pdf',
        width: 400,
      }),
    ).toThrow('outside the configured allowed prefixes')
    expect(connection).not.toHaveBeenCalled()
  })

  test('snapshots direct Storage props before crossing the request boundary', async () => {
    const { StorageImage: Image } = createTransloaditImage(baseConfiguration)
    let height = 300
    let id = 'original-id'
    let path = 'documents/report.pdf'
    let width = 400
    connection.mockImplementationOnce(() => {
      height = 0
      id = 'mutated-id'
      path = 'private/secret.pdf'
      width = 0
      return Promise.resolve(undefined)
    })
    const node = Image({
      alt: 'Snapshotted',
      get height() {
        return height
      },
      get id() {
        return id
      },
      get src() {
        return path
      },
      get width() {
        return width
      },
      widths: [400],
    })
    const document = parseMarkup(await renderAsync(node))
    const candidate = parseSmartCdnUrl(getFirstCandidate(document), {
      baseUrl: baseConfiguration.baseUrl,
      workspace: baseConfiguration.workspace,
    })

    expect(candidate.input).toBe('documents/report.pdf')
    expect(candidate.urlParams.h).toBe('300')
    expect(candidate.urlParams.w).toBe('400')
    expect(document.querySelector('img')?.id).toBe('original-id')
  })

  test('renders opaque authorized-route capabilities without request I/O or credentials', () => {
    const { authorize, url } = getStorageRouteCandidate()

    expect(connection).not.toHaveBeenCalled()
    expect(authorize).not.toHaveBeenCalled()
    expect(url.origin).toBe('https://app.example')
    expect(url.pathname).toBe('/api/private-images')
    expect([...url.searchParams.keys()]).toEqual(['cap'])
    expect(url.href).not.toContain('documents')
    expect(url.href).not.toContain('report.pdf')
    expect(url.href).not.toContain('auth-key')
    expect(url.href).not.toContain(authSecret)
  })

  test('prepends basePath while accepting Next.js stripped handler paths', async () => {
    const { StorageImage: Image, storageRoute } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        allowedPathPrefixes: ['documents/'],
        delivery: {
          authorize: () => true,
          basePath: '/app',
          route: '/api/private-images',
        },
      },
    })
    const markup = renderToStaticMarkup(
      <Image alt="Base path" height={300} src="documents/report.pdf" width={400} />,
    )
    const externalUrl = new URL(getFirstCandidate(parseMarkup(markup)), 'https://app.example')
    const internalUrl = new URL(externalUrl)
    internalUrl.pathname = '/api/private-images'
    const internalResponse = await storageRoute(new Request(internalUrl))
    const externalResponse = await storageRoute(new Request(externalUrl))
    const trailingSlashUrl = new URL(externalUrl)
    trailingSlashUrl.pathname = `${trailingSlashUrl.pathname}/`
    const trailingSlashResponse = await storageRoute(new Request(trailingSlashUrl))

    expect(externalUrl.pathname).toBe('/app/api/private-images')
    expect(internalResponse.status).toBe(307)
    expect(externalResponse.status).toBe(307)
    expect(trailingSlashResponse.status).toBe(307)
  })

  test('requires authorize to return the boolean true', async () => {
    const typedAuthorize = (): boolean => false
    const malformedAuthorize = new Proxy(typedAuthorize, {
      apply() {
        return 'false'
      },
    })
    const { StorageImage: Image, storageRoute } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        allowedPathPrefixes: ['documents/'],
        delivery: { authorize: malformedAuthorize, route: '/api/private-images' },
      },
    })
    const markup = renderToStaticMarkup(
      <Image alt="Strict ACL" height={300} src="documents/report.pdf" width={400} />,
    )
    const routeUrl = new URL(getFirstCandidate(parseMarkup(markup)), 'https://app.example')

    expect(await storageRoute(new Request(routeUrl))).toMatchObject({ status: 404 })
  })

  test('authorizes one exact route request and redirects without proxying image bytes', async () => {
    const { authorize, storageRoute, url } = getStorageRouteCandidate()
    const request = new Request(url, { headers: { Authorization: 'Bearer allowed' } })
    const response = await storageRoute(request)
    const location = response.headers.get('location')
    if (location === null) throw new Error('Expected a redirect location')
    const target = parseSmartCdnUrl(location, {
      baseUrl: baseConfiguration.baseUrl,
      workspace: baseConfiguration.workspace,
    })

    expect(response.status).toBe(307)
    expect(await response.text()).toBe('')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(authorize).toHaveBeenCalledOnce()
    expect(authorize).toHaveBeenCalledWith({ path: 'documents/report.pdf', request })
    expect(target.template).toBe('builtin/storage-preview@0.0.2')
    expect(target.input).toBe('documents/report.pdf')
    expect(target.urlParams).toMatchObject({ f: 'avif', h: '240', q: '45', r: 'pad', w: '320' })
    expect(target.auth?.expiresAt).toBe(Date.parse('2029-01-01T14:00:00Z'))
  })

  test('keeps cached capabilities valid while rotating only their redirect targets', async () => {
    const { StorageImage: Image, storageRoute } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        allowedPathPrefixes: ['documents/'],
        delivery: { authorize: () => true, route: '/api/private-images' },
      },
    })
    const render = (): URL => {
      const markup = renderToStaticMarkup(
        <Image alt="Stable" height={300} src="documents/report.pdf" width={400} />,
      )
      return new URL(getFirstCandidate(parseMarkup(markup)), 'https://app.example')
    }
    const first = render()
    const firstRedirect = await storageRoute(new Request(first))

    vi.setSystemTime('2029-01-01T13:00:00Z')
    const second = render()
    const secondRedirect = await storageRoute(new Request(second))
    const cachedRedirect = await storageRoute(new Request(first))

    expect(second.href).toBe(first.href)
    expect(secondRedirect.headers.get('location')).not.toBe(firstRedirect.headers.get('location'))
    expect(cachedRedirect.status).toBe(307)
    expect(cachedRedirect.headers.get('location')).toBe(secondRedirect.headers.get('location'))
    expect(connection).not.toHaveBeenCalled()
  })

  test('refreshes an expired target from cached markup, then denies new grants after revocation', async () => {
    const authorize = vi.fn(() => true)
    const { StorageImage: Image, storageRoute } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        allowedPathPrefixes: ['documents/'],
        delivery: { authorize, route: '/api/private-images' },
        expiresInMs: 5 * 60 * 1000,
        rotationIntervalMs: 30 * 1000,
      },
    })
    const document = parseMarkup(
      renderToStaticMarkup(
        <Image alt="Long-lived preview" height={300} src="documents/report.pdf" width={400} />,
      ),
    )
    const originalCapability = new URL(getFirstCandidate(document), 'https://app.example')
    const firstResponse = await storageRoute(new Request(originalCapability))
    const firstLocation = firstResponse.headers.get('location')
    if (firstLocation === null) throw new Error('Expected the first authorized target')
    const originalExpiry = Number(new URL(firstLocation).searchParams.get('exp'))
    expect(originalExpiry).toBe(Date.parse('2029-01-01T12:07:30Z'))

    vi.setSystemTime(originalExpiry + 1)
    const renewed = await storageRoute(new Request(originalCapability))
    const renewedLocation = renewed.headers.get('location')
    if (renewedLocation === null) throw new Error('Expected a renewed authorized target')
    expect(renewed.status).toBe(307)
    expect(renewedLocation).not.toBe(firstLocation)
    expect(Number(new URL(renewedLocation).searchParams.get('exp'))).toBe(
      Date.parse('2029-01-01T12:13:00Z'),
    )
    expect(renewed.headers.get('cache-control')).toBe('private, no-store')
    expect(await renewed.text()).toBe('')

    authorize.mockReturnValue(false)
    const denied = await storageRoute(new Request(originalCapability))
    expect(denied.status).toBe(404)
    expect(denied.headers.get('location')).toBeNull()
    expect(denied.headers.get('cache-control')).toBe('private, no-store')
    expect(await denied.text()).toBe('')
    expect(authorize).toHaveBeenCalledTimes(3)
  })

  test('binds capabilities to the secret, workspace, Template, route, and basePath', async () => {
    const { url } = getStorageRouteCandidate()
    const authorize = vi.fn(() => true)
    const createBoundRoute = ({
      authSecret: candidateSecret = authSecret,
      basePath,
      route = '/api/private-images',
      storageTemplate,
      workspace = baseConfiguration.workspace,
    }: {
      authSecret?: string
      basePath?: string
      route?: string
      storageTemplate?: string
      workspace?: string
    } = {}) =>
      createTransloaditImage({
        ...baseConfiguration,
        authSecret: candidateSecret,
        storage: {
          allowedPathPrefixes: ['documents/'],
          delivery: { authorize, basePath, route },
        },
        template: storageTemplate,
        workspace,
      }).storageRoute
    const otherRouteUrl = new URL(url)
    otherRouteUrl.pathname = '/api/other-images'
    const basePathUrl = new URL(url)
    basePathUrl.pathname = '/app/api/private-images'
    const attempts = [
      {
        label: 'secret',
        requestUrl: url,
        storageRoute: createBoundRoute({ authSecret: 'another-secret' }),
      },
      {
        label: 'workspace',
        requestUrl: url,
        storageRoute: createBoundRoute({ workspace: 'another-app' }),
      },
      {
        label: 'Template',
        requestUrl: url,
        storageRoute: createBoundRoute({ storageTemplate: 'customer/storage-preview' }),
      },
      {
        label: 'route',
        requestUrl: otherRouteUrl,
        storageRoute: createBoundRoute({ route: '/api/other-images' }),
      },
      {
        label: 'basePath',
        requestUrl: basePathUrl,
        storageRoute: createBoundRoute({ basePath: '/app' }),
      },
    ]

    for (const { label, requestUrl, storageRoute } of attempts) {
      const response = await storageRoute(
        new Request(requestUrl, { headers: { Authorization: 'Bearer allowed' } }),
      )
      expect(response.status, label).toBe(404)
    }
    expect(authorize).not.toHaveBeenCalled()
  })

  test('returns the same empty 404 before authorization for every altered route capability', async () => {
    const mutations: Array<{ label: string; mutate: (url: URL) => void }> = [
      {
        label: 'authenticated bytes',
        mutate(url): void {
          const capability = url.searchParams.get('cap')
          if (capability === null) throw new Error('Expected a capability')
          const replacement = capability.startsWith('A') ? 'B' : 'A'
          url.searchParams.set('cap', `${replacement}${capability.slice(1)}`)
        },
      },
      {
        label: 'truncated',
        mutate(url): void {
          const capability = url.searchParams.get('cap')
          if (capability === null) throw new Error('Expected a capability')
          url.searchParams.set('cap', capability.slice(0, -1))
        },
      },
      {
        label: 'invalid alphabet',
        mutate(url): void {
          url.searchParams.set('cap', '%invalid')
        },
      },
      {
        label: 'oversized',
        mutate(url): void {
          url.searchParams.set('cap', 'A'.repeat(4097))
        },
      },
      {
        label: 'duplicate',
        mutate(url): void {
          const capability = url.searchParams.get('cap')
          if (capability === null) throw new Error('Expected a capability')
          url.searchParams.append('cap', capability)
        },
      },
      {
        label: 'unknown',
        mutate(url): void {
          url.searchParams.set('download', '1')
        },
      },
      {
        label: 'route',
        mutate(url): void {
          url.pathname = '/api/other-images'
        },
      },
    ]

    for (const { label, mutate } of mutations) {
      const { authorize, storageRoute, url } = getStorageRouteCandidate()
      mutate(url)
      const response = await storageRoute(
        new Request(url, { headers: { Authorization: 'Bearer allowed' } }),
      )
      expect(response.status, label).toBe(404)
      expect(await response.text(), label).toBe('')
      expect(response.headers.get('cache-control'), label).toBe('private, no-store')
      expect(authorize, label).not.toHaveBeenCalled()
    }
  })

  test('conceals failed application authorization and disallows other methods', async () => {
    const { authorize, storageRoute, url } = getStorageRouteCandidate()
    const denied = await storageRoute(new Request(url))
    const post = await storageRoute(
      new Request(url, { headers: { Authorization: 'Bearer allowed' }, method: 'POST' }),
    )
    const head = await storageRoute(
      new Request(url, { headers: { Authorization: 'Bearer allowed' }, method: 'HEAD' }),
    )

    expect(denied.status).toBe(404)
    expect(await denied.text()).toBe('')
    expect(head.status).toBe(307)
    expect(await head.text()).toBe('')
    expect(authorize).toHaveBeenCalledTimes(2)
    expect(post.status).toBe(405)
    expect(post.headers.get('allow')).toBe('GET, HEAD')
  })

  test('rejects direct-only suspense props in static redirect mode', () => {
    const { StorageImage: Image } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        allowedPathPrefixes: ['documents/'],
        delivery: { authorize: () => true, route: '/api/private-images' },
      },
    })

    expect(() =>
      Reflect.apply(Image, undefined, [
        {
          alt: 'No suspension',
          height: 300,
          src: 'documents/report.pdf',
          suspenseFallback: 'Loading',
          width: 400,
        },
      ]),
    ).toThrow('suspenseFallback is only used by direct Storage delivery')
  })

  test.each([
    'auth_key',
    'exp',
    'f',
    'h',
    'q',
    'r',
    'sig',
    'w',
  ])('reserves image-policy parameter %s from global URL parameters', (parameter) => {
    expect(() =>
      createTransloaditImage({
        ...baseConfiguration,
        urlParams: { [parameter]: 'caller-controlled' },
      }),
    ).toThrow(`urlParams must not override image policy parameter: ${parameter}`)
  })

  test('validates credentials, route configuration, and bounded expiry', () => {
    expect(() => createTransloaditImage({ ...baseConfiguration, authKey: '' })).toThrow(
      'authKey must be a non-empty string',
    )
    expect(() =>
      createTransloaditImage({ ...baseConfiguration, baseUrl: 'ftp://cdn.example/file' }),
    ).toThrow('baseUrl must be an absolute HTTP(S) URL')
    expect(() =>
      createTransloaditImage({
        ...baseConfiguration,
        storage: {
          allowedPathPrefixes: ['documents/'],
          expiresInMs: 48 * 60 * 60 * 1000,
          rotationIntervalMs: 5 * 60 * 1000,
        },
      }),
    ).toThrow('must not exceed 48 hours')
    expect(() =>
      createTransloaditImage({
        ...baseConfiguration,
        storage: {
          allowedPathPrefixes: ['documents/'],
          delivery: { authorize: () => true, route: 'api/private-images' },
        },
      }),
    ).toThrow('storage.delivery.route must be one absolute application path')
    expect(() =>
      createTransloaditImage({
        ...baseConfiguration,
        storage: {
          allowedPathPrefixes: ['documents/'],
          delivery: {
            authorize: () => true,
            basePath: '/app/',
            route: '/api/private-images',
          },
        },
      }),
    ).toThrow('storage.delivery.basePath must be one absolute path without a trailing slash')
    expect(() =>
      Reflect.apply(createTransloaditImage, undefined, [
        {
          ...baseConfiguration,
          storage: {
            allowedPathPrefixes: ['documents/'],
            delivery: { authorize: 'yes', route: '/api/private-images' },
          },
        },
      ]),
    ).toThrow('storage.delivery.authorize must be a function')
  })

  test('keeps template selection in trusted factory configuration', async () => {
    const { StorageImage: Image } = createTransloaditImage({
      ...baseConfiguration,
      template: 'my-storage-preview',
    })
    const storageDocument = parseMarkup(
      await renderAsync(
        <Image alt="Storage" height={600} src="documents/report.pdf" width={800} />,
      ),
    )

    expect(
      parseSmartCdnUrl(getFirstCandidate(storageDocument), {
        baseUrl: baseConfiguration.baseUrl,
        workspace: baseConfiguration.workspace,
      }).template,
    ).toBe('my-storage-preview')
  })
})
