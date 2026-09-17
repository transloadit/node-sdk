import type { StorageProjectCatalog } from '../src/next/catalog.ts'
import type { AuthorizeTransloaditImage } from '../src/next/server.tsx'

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parseSmartCdnUrl } from '@transloadit/utils/node'
import { Window } from 'happy-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const storageReference = vi.hoisted(() => ({
  workspace: 'catalog-app',
  asset_id: 'A'.repeat(22),
  version_id: 'B'.repeat(21) + 'A',
}))

const project = vi.hoisted<{
  catalog: StorageProjectCatalog
  authorize: AuthorizeTransloaditImage | undefined
  authorizePath?: string
}>(() => ({
  catalog: {
    workspace: 'catalog-app',
    public: ['website/'],
    images: {
      'website/hero.jpg': {
        ...storageReference,
        path: 'website/hero.jpg',
        width: 1200,
        height: 800,
      },
      'uploads/avatar.png': {
        ...storageReference,
        path: 'uploads/avatar.png',
        width: 96,
        height: 96,
      },
    },
    delivery: undefined,
  },
  authorize: undefined,
}))
const window = new Window()
vi.mock('server-only', () => ({}))
vi.mock('@transloadit/viewer/next/catalog', () => ({
  get default() {
    return project.catalog
  },
}))
vi.mock('@transloadit/viewer/next/authorize', () => ({
  get authorize() {
    return project.authorize
  },
}))
vi.mock('@transloadit/viewer/next/options', () => ({
  default: {
    diagnosticsId: 'conventional-test',
    get authorizePath() {
      return project.authorizePath
    },
  },
}))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NODE_ENV', 'production')
  for (const name of [
    'TRANSLOADIT_WORKSPACE',
    'TRANSLOADIT_KEY',
    'TRANSLOADIT_SECRET',
    'TRANSLOADIT_SMART_CDN_KEY',
    'TRANSLOADIT_SMART_CDN_SECRET',
  ])
    vi.stubEnv(name, undefined)
  project.authorize = undefined
  project.authorizePath = undefined
  project.catalog.public = ['website/']
  project.catalog.delivery = undefined
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('package Image renders a catalog path with intrinsic dimensions and no secrets', async () => {
  const { Image } = await import('../src/next/react-server.tsx')
  const html = renderToStaticMarkup(
    <Image storage src="website/hero.jpg" width={960} alt="Canal houses" preload />,
  )
  const document = new window.DOMParser().parseFromString(html, 'text/html')
  expect(document.querySelector('img')?.getAttribute('height')).toBe('640')
  const url = document.querySelector('img')?.getAttribute('src')
  expect(url).toContain('catalog-app.tlcdn.com')
  expect(url).not.toMatch(/auth_key|sig=|exp=/)
})

test('catalog delivery overrides are used without a generated factory', async () => {
  project.catalog.delivery = {
    baseUrl: 'http://127.0.0.1:32189/file/{workspace}',
    urlParams: { cdn: 'required' },
  }
  const { Image } = await import('../src/next/react-server.tsx')
  const html = renderToStaticMarkup(<Image storage src="website/hero.jpg" alt="Hero" />)
  expect(html).toContain('http://127.0.0.1:32189/file/catalog-app/')
  expect(html).toContain('cdn=required')
})

test('a preserved incomplete legacy receipt does not break another catalog image', async () => {
  const original = project.catalog
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  project.catalog = {
    ...original,
    images: {
      ...original.images,
      'legacy/incomplete.jpg': { path: 'legacy/incomplete.jpg', width: 0, height: 0 },
    },
  }
  try {
    const { Image } = await import('../src/next/react-server.tsx')
    expect(renderToStaticMarkup(<Image storage src="website/hero.jpg" alt="Hero" />)).toContain(
      'builtin%2Fpublic-preview',
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('legacy/incomplete.jpg'))
  } finally {
    project.catalog = original
  }
})

test.each([
  'catalog',
  'delivery',
])('extra %s metadata cannot configure the signing factory', async (location) => {
  const original = project.catalog
  const metadata = {
    template: 'custom-template',
    lifetime: -1,
    authKey: 'metadata-key',
    authSecret: 'metadata-secret',
    allowWorkspaceRoot: true,
  }
  project.catalog =
    location === 'catalog'
      ? { ...original, ...metadata }
      : { ...original, delivery: { ...original.delivery, ...metadata } }
  try {
    const { Image } = await import('../src/next/react-server.tsx')
    const html = renderToStaticMarkup(<Image storage src="website/hero.jpg" alt="Hero" />)
    expect(html).toContain('builtin%2Fpublic-preview%400.0.2')
    expect(html).not.toMatch(/custom-template|metadata-key|metadata-secret|sig=/)
  } finally {
    project.catalog = original
  }
})

test.each([
  'development',
  'production',
])('an authorizer added after bundling gets restart advice only in %s', async (environment) => {
  vi.stubEnv('NODE_ENV', environment)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 200 })),
  )
  const directory = await mkdtemp(join(tmpdir(), 'img-late-authorizer-'))
  project.authorizePath = join(directory, 'transloadit.authorize.ts')
  try {
    const { Image } = await import('../src/next/react-server.tsx')
    const renderPrivate = () =>
      renderToStaticMarkup(<Image storage src="uploads/avatar.png" alt="Avatar" />)
    expect(renderPrivate).toThrow("Private images require authorize or delivery: 'direct'")
    await writeFile(project.authorizePath, 'export const authorize = () => false\n')
    expect(renderPrivate).toThrow(
      environment === 'development'
        ? 'transloadit.authorize.ts exists but was added after next dev started. Restart next dev to bundle it.'
        : "Private images require authorize or delivery: 'direct'",
    )
    // The late file never changes the bundled policy or blocks already-public delivery.
    const html = renderToStaticMarkup(<Image storage src="website/hero.jpg" alt="Hero" />)
    expect(html).toContain('builtin%2Fpublic-preview')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('the conventional private handler checks each request and never returns image bytes', async () => {
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'app-key')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', 'app-secret')
  const authorize = vi.fn(
    ({ path, request }: { path: string; request: Request }) =>
      path === 'uploads/avatar.png' && request.headers.get('cookie') === 'session=allowed',
  )
  project.authorize = authorize
  const { Image } = await import('../src/next/react-server.tsx')
  const { GET, HEAD } = await import('../src/next/route.ts')
  const html = renderToStaticMarkup(<Image storage src="uploads/avatar.png" alt="Avatar" />)
  const document = new window.DOMParser().parseFromString(html, 'text/html')
  const src = document.querySelector('img')?.getAttribute('src')
  if (src === null || src === undefined) throw new Error('Expected private image route')
  const request = new Request(new URL(src, 'https://app.example'))
  expect((await GET(request)).status).toBe(404)
  const allowed = await HEAD(new Request(request, { headers: { cookie: 'session=allowed' } }))
  expect(authorize).toHaveBeenCalledTimes(2)
  expect(allowed.status).toBe(307)
  expect(await allowed.text()).toBe('')
  expect(parseSmartCdnUrl(allowed.headers.get('location') ?? '').input).toBe(
    storageReference.asset_id,
  )
  expect(html).not.toMatch(/app-key|app-secret|auth_key/)
})

test('a late authorizer never silently leaves custom templates in direct development delivery', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  const directory = await mkdtemp(join(tmpdir(), 'viewer-late-authorizer-'))
  project.authorizePath = join(directory, 'transloadit.authorize.ts')
  try {
    const { Image } = await import('../src/next/react-server.tsx')
    await writeFile(project.authorizePath, 'export const authorize = () => false\n')
    expect(() =>
      renderToStaticMarkup(
        <Image template="products" src="chair.jpg" width={300} height={200} alt="Chair" />,
      ),
    ).toThrow(/authorizer|transloadit\.authorize\.ts.*Restart next dev/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('a catalog reload names newly private paths once, never in production', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'app-key')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', 'app-secret')
  project.authorize = () => false
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  const { getProjectImages } = await import('../src/next/project.ts')
  getProjectImages()
  expect(info).not.toHaveBeenCalled()
  project.catalog.public = []
  vi.resetModules()
  const refreshed = await import('../src/next/project.ts')
  refreshed.getProjectImages()
  refreshed.getProjectImages()
  expect(info).toHaveBeenCalledExactlyOnceWith(
    '[Image] Catalog public prefixes changed. These paths now require the private image route and authorization: "website/hero.jpg".',
  )
  const { Image: CatalogImage } = refreshed.getProjectImages()
  const html = renderToStaticMarkup(<CatalogImage src="website/hero.jpg" alt="Hero" />)
  expect(html).toContain('/api/storage-images?cap=')
  expect(html).not.toContain('builtin%2Fpublic-preview')
  project.catalog.public = ['website/']
  vi.resetModules()
  ;(await import('../src/next/project.ts')).getProjectImages()
  vi.stubEnv('NODE_ENV', 'production')
  project.catalog.public = []
  vi.resetModules()
  ;(await import('../src/next/project.ts')).getProjectImages()
  expect(info).toHaveBeenCalledOnce()
})
