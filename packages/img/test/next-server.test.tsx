// @vitest-environment happy-dom

import type { ReactNode } from 'react'

import { parseSmartCdnUrl } from '@transloadit/utils/node'
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { connection } = vi.hoisted(() => ({ connection: vi.fn(async () => undefined) }))

vi.mock('next/server.js', () => ({ connection }))
vi.mock('server-only', () => ({}))

import { createTransloaditImage } from '../src/next/server.tsx'

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
  const { Image, storageRoute } = createTransloaditImage({
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

describe('createTransloaditImage', () => {
  test('allows explicit widths while making sizes optional', async () => {
    const { Image } = createTransloaditImage(baseConfiguration)
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

    expect(source?.hasAttribute('sizes')).toBe(false)
    expect(source?.getAttribute('srcset')).toContain('200w')
    expect(source?.getAttribute('srcset')).toContain('400w')
    expect(source?.getAttribute('srcset')).toContain('800w')
  })

  test('rejects coercible Storage sources before signing', () => {
    const { Image } = createTransloaditImage(baseConfiguration)
    const stringConversion = vi.fn(() => 'https://assets.example/photo.jpg')

    expect(() =>
      Reflect.apply(Image, undefined, [
        { alt: 'Coercible', height: 600, src: { toString: stringConversion }, width: 800 },
      ]),
    ).toThrow('Storage image src must be one relative object path')
    expect(stringConversion).not.toHaveBeenCalled()
  })

  test('request-renders direct Storage previews with bounded stable signatures', async () => {
    const { Image } = createTransloaditImage(baseConfiguration)
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
    expect(firstSource.pathname).toContain('/builtin%2Fstorage-preview%400.0.1/')
    expect(firstSource.searchParams.get('f')).toBe('webp')
    expect(firstSource.searchParams.get('h')).toBe('150')
    expect(firstSource.searchParams.get('q')).toBe('61')
    expect(firstFallback.searchParams.get('f')).toBe('jpg')
    expect(firstDocument.querySelector('img')?.getAttribute('loading')).toBe('lazy')
    expect(firstSource.searchParams.get('exp')).toBe(String(Date.parse('2029-01-01T13:05:00Z')))

    vi.setSystemTime('2029-01-01T12:04:59.999Z')
    const sameWindow = await render()
    expect(sameWindow.querySelector('source')?.getAttribute('srcset')).toBe(
      firstDocument.querySelector('source')?.getAttribute('srcset'),
    )

    vi.setSystemTime('2029-01-01T12:05:00.000Z')
    const nextWindow = await render()
    expect(nextWindow.querySelector('source')?.getAttribute('srcset')).not.toBe(
      firstDocument.querySelector('source')?.getAttribute('srcset'),
    )
  })

  test('denies private paths by default and matches explicit directory boundaries', () => {
    const { Image: denyAllImage } = createTransloaditImage({
      ...baseConfiguration,
      storage: {},
    })
    const { Image } = createTransloaditImage(baseConfiguration)

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
    const { Image } = createTransloaditImage(baseConfiguration)
    let height = 300
    let path = 'documents/report.pdf'
    let width = 400
    connection.mockImplementationOnce(() => {
      height = 0
      path = 'private/secret.pdf'
      width = 0
      return Promise.resolve(undefined)
    })
    const node = Image({
      alt: 'Snapshotted',
      get height() {
        return height
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
    const { Image, storageRoute } = createTransloaditImage({
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
    const { Image, storageRoute } = createTransloaditImage({
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
    expect(target.template).toBe('builtin/storage-preview@0.0.1')
    expect(target.input).toBe('documents/report.pdf')
    expect(target.urlParams).toMatchObject({ f: 'avif', h: '240', q: '45', r: 'pad', w: '320' })
    expect(target.auth?.expiresAt).toBe(Date.parse('2029-01-01T13:05:00Z'))
  })

  test('keeps cached capabilities valid while rotating only their redirect targets', async () => {
    const { Image, storageRoute } = createTransloaditImage({
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

    vi.setSystemTime('2029-01-01T12:05:00Z')
    const second = render()
    const secondRedirect = await storageRoute(new Request(second))
    const cachedRedirect = await storageRoute(new Request(first))

    expect(second.href).toBe(first.href)
    expect(secondRedirect.headers.get('location')).not.toBe(firstRedirect.headers.get('location'))
    expect(cachedRedirect.status).toBe(307)
    expect(cachedRedirect.headers.get('location')).toBe(secondRedirect.headers.get('location'))
    expect(connection).not.toHaveBeenCalled()
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
    const { Image } = createTransloaditImage({
      ...baseConfiguration,
      storage: {
        allowedPathPrefixes: ['documents/'],
        delivery: { authorize: () => true, route: '/api/private-images' },
      },
    })

    expect(() =>
      Image({
        alt: 'No suspension',
        height: 300,
        src: 'documents/report.pdf',
        suspenseFallback: 'Loading',
        width: 400,
      }),
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
    const { Image } = createTransloaditImage({
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
