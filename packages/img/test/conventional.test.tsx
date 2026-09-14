import { parseSmartCdnUrl } from '@transloadit/utils/node'
import { Window } from 'happy-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const project = vi.hoisted<{
  catalog: StorageProjectCatalog
  authorize: AuthorizeTransloaditStorageImage | undefined
}>(() => ({
  catalog: {
    workspace: 'catalog-app',
    public: ['website/'],
    images: {
      'website/hero.jpg': { path: 'website/hero.jpg', width: 1200, height: 800 },
      'uploads/avatar.png': { path: 'uploads/avatar.png', width: 96, height: 96 },
    },
    delivery: undefined,
  },
  authorize: undefined,
}))
const window = new Window()
vi.mock('server-only', () => ({}))
vi.mock('@transloadit/img/next/catalog', () => ({
  get default() {
    return project.catalog
  },
}))
vi.mock('@transloadit/img/next/authorize', () => ({
  get authorize() {
    return project.authorize
  },
}))
vi.mock('@transloadit/img/next/options', () => ({
  default: { diagnosticsId: 'conventional-test' },
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
  project.catalog.public = ['website/']
  project.catalog.delivery = undefined
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

test('package StorageImage renders a catalog path with intrinsic dimensions and no secrets', async () => {
  const { StorageImage } = await import('../src/next/react-server.tsx')
  const html = renderToStaticMarkup(
    <StorageImage src="website/hero.jpg" width={960} alt="Canal houses" preload />,
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
  const { StorageImage } = await import('../src/next/react-server.tsx')
  const html = renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />)
  expect(html).toContain('http://127.0.0.1:32189/file/catalog-app/')
  expect(html).toContain('cdn=required')
})

test('the conventional private handler checks each request and never returns image bytes', async () => {
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'app-key')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', 'app-secret')
  const authorize = vi.fn(
    ({ path, request }: { path: string; request: Request }) =>
      path === 'uploads/avatar.png' && request.headers.get('cookie') === 'session=allowed',
  )
  project.authorize = authorize
  const { StorageImage } = await import('../src/next/react-server.tsx')
  const { GET, HEAD } = await import('../src/next/route.ts')
  const html = renderToStaticMarkup(<StorageImage src="uploads/avatar.png" alt="Avatar" />)
  const document = new window.DOMParser().parseFromString(html, 'text/html')
  const src = document.querySelector('img')?.getAttribute('src')
  if (src === null || src === undefined) throw new Error('Expected private image route')
  const request = new Request(new URL(src, 'https://app.example'))
  expect((await GET(request)).status).toBe(404)
  const allowed = await HEAD(new Request(request, { headers: { cookie: 'session=allowed' } }))
  expect(authorize).toHaveBeenCalledTimes(2)
  expect(allowed.status).toBe(307)
  expect(await allowed.text()).toBe('')
  expect(parseSmartCdnUrl(allowed.headers.get('location') ?? '').input).toBe('uploads/avatar.png')
  expect(html).not.toMatch(/app-key|app-secret|auth_key/)
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
    '[StorageImage] Catalog public prefixes changed. These paths now require the private image route and authorization: "website/hero.jpg".',
  )
  const { StorageImage } = refreshed.getProjectImages()
  const html = renderToStaticMarkup(<StorageImage src="website/hero.jpg" alt="Hero" />)
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

import type { StorageProjectCatalog } from '../src/next/catalog.ts'
import type { AuthorizeTransloaditStorageImage } from '../src/next/server.tsx'
