// @vitest-environment happy-dom

import type { ReactNode } from 'react'

import type { StorageProjectCatalog } from '../src/next/catalog.ts'
import type { AuthorizeTransloaditImage } from '../src/next/server.tsx'

import { parseSmartCdnUrl } from '@transloadit/utils/node'
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const project = vi.hoisted<{
  catalog: StorageProjectCatalog | undefined
  authorize: AuthorizeTransloaditImage | undefined
  workspace: string | undefined
}>(() => ({ catalog: undefined, authorize: undefined, workspace: undefined }))

vi.mock('server-only', () => ({}))
vi.mock('next/server.js', () => ({ connection: async () => undefined }))
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
    get workspace() {
      return project.workspace
    },
  },
}))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('TRANSLOADIT_WORKSPACE', undefined)
  vi.stubEnv('TRANSLOADIT_KEY', 'test-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'test-secret')
  vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', undefined)
  vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', undefined)
  project.workspace = undefined
  project.authorize = undefined
  project.catalog = {
    workspace: 'catalog-shop',
    public: ['website/'],
    images: { 'website/hero.jpg': { path: 'website/hero.jpg', width: 1200, height: 800 } },
  }
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

async function markup(node: ReactNode): Promise<string> {
  const errors: unknown[] = []
  const stream = await renderToReadableStream(node, {
    onError(error) {
      errors.push(error)
    },
  })
  await stream.allReady
  const html = await new Response(stream).text()
  if (errors.length > 0) throw errors[0]
  return html
}

function source(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const src = document.querySelector('img:not([aria-hidden])')?.getAttribute('src')
  if (!src) throw new Error('Expected the resolved native image')
  expect(document.querySelector('img')?.hasAttribute('workspace')).toBe(false)
  expect(document.querySelector('img')?.hasAttribute('storage')).toBe(false)
  expect(document.querySelector('img')?.hasAttribute('template')).toBe(false)
  return src
}

test('Image storage takes its workspace and dimensions from the catalog', async () => {
  const { Image } = await import('../src/next/react-server.tsx')
  const html = renderToStaticMarkup(
    <Image storage src="website/hero.jpg" alt="House" width={960} />,
  )
  const parsed = parseSmartCdnUrl(source(html))
  expect(parsed.workspace).toBe('catalog-shop')
  expect(parsed.template).toBe('builtin/public-preview@0.0.1')
  expect(parsed.auth).toBeUndefined()
  expect(html).toContain('height="640"')
})

test('Storage without a catalog names the upload command and dev restart', async () => {
  project.catalog = undefined
  const { Image } = await import('../src/next/react-server.tsx')
  expect(() => renderToStaticMarkup(<Image storage src="website/hero.jpg" alt="House" />)).toThrow(
    /transloadit\.images\.json.*transloadit storage store.*[Rr]estart next dev/,
  )
})

test('Image rejects an explicit workspace that conflicts with its Storage catalog', async () => {
  const { Image } = await import('../src/next/react-server.tsx')
  expect(() =>
    renderToStaticMarkup(
      <Image storage workspace="other-shop" src="website/hero.jpg" alt="House" />,
    ),
  ).toThrow(/workspace.*catalog-shop.*other-shop/i)
})

test('a project workspace default cannot reinterpret a Storage catalog', async () => {
  project.workspace = 'other-shop'
  const { Image } = await import('../src/next/react-server.tsx')
  expect(() => renderToStaticMarkup(<Image storage src="website/hero.jpg" alt="House" />)).toThrow(
    /workspace.*catalog-shop.*other-shop/i,
  )
})

test('Storage still treats URL-like characters as literal object-key text', async () => {
  const path = 'website/%2e%2e/photo?#.jpg'
  project.catalog = {
    workspace: 'catalog-shop',
    public: ['website/'],
    images: { [path]: { path, width: 1200, height: 800 } },
  }
  const { Image } = await import('../src/next/react-server.tsx')
  const html = renderToStaticMarkup(<Image storage src={path} alt="Literal filename" />)
  expect(parseSmartCdnUrl(source(html)).input).toBe(path)
})

test('a template image does not inherit the Storage catalog or its public prefixes', async () => {
  const { Image } = await import('../src/next/react-server.tsx')
  const html = await markup(
    <Image
      template="product-images"
      src="website/hero.jpg"
      width={300}
      height={200}
      alt="Product"
    />,
  )
  const parsed = parseSmartCdnUrl(source(html))
  expect(parsed.workspace).toBe('catalog-shop')
  expect(parsed.template).toBe('product-images')
  expect(parsed.auth).toBeDefined()
  expect(html).toContain('width="300"')
  expect(html).not.toContain('test-secret')
})

test('a template image works without a Storage catalog or upload, using trusted CMS metadata', async () => {
  project.catalog = undefined
  const { Image } = await import('../src/next/react-server.tsx')
  const html = await markup(
    <Image
      workspace="cms-shop"
      template="product-images"
      src={{ path: 'chairs/oak.jpg', width: 1200, height: 800 }}
      width={480}
      alt="Chair"
    />,
  )
  const parsed = parseSmartCdnUrl(source(html))
  expect(parsed.workspace).toBe('cms-shop')
  expect(parsed.template).toBe('product-images')
  expect(html).toContain('height="320"')
})

test('template workspace conflicts cannot silently borrow the default workspace credentials', async () => {
  vi.stubEnv('TRANSLOADIT_WORKSPACE', 'default-shop')
  const { Image } = await import('../src/next/react-server.tsx')
  await expect(
    markup(
      <Image
        workspace="other-shop"
        template="products"
        src="chair.jpg"
        width={300}
        height={200}
        alt="Chair"
      />,
    ),
  ).rejects.toThrow(/credentials.*workspace/i)
})

test('runtime callers cannot choose storage and a template together', async () => {
  const { Image } = await import('../src/next/react-server.tsx')
  expect(() =>
    renderToStaticMarkup(
      // @ts-expect-error JavaScript callers must receive the same selector rejection as TypeScript.
      <Image storage template="products" src="website/hero.jpg" alt="House" />,
    ),
  ).toThrow(/storage.*template/i)
})

test('a catalog-free template route denies requests without a source selector', async () => {
  project.catalog = undefined
  project.authorize = vi.fn(() => true)
  const { GET } = await import('../src/next/route.ts')
  const response = await GET(new Request('https://app.example/api/storage-images?cap=invalid'))
  expect(response.status).toBe(404)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(project.authorize).not.toHaveBeenCalled()
})

test('custom template names must fit the redirect selector limit before rendering', async () => {
  project.authorize = vi.fn(() => true)
  const { Image } = await import('../src/next/react-server.tsx')
  expect(() =>
    renderToStaticMarkup(
      <Image template={'a'.repeat(257)} src="photo.jpg" width={300} height={200} alt="Photo" />,
    ),
  ).toThrow(/template.*256/i)
})

test.each([
  'chairs/%2e%2e/private.jpg',
  'chairs/%252e%252e/private.jpg',
  'chairs/photo.jpg?download=private.jpg',
  'chairs/photo.jpg#private.jpg',
])('custom templates reject URL-interpreted input %s before signing', async (path) => {
  project.authorize = vi.fn(() => true)
  const { Image } = await import('../src/next/react-server.tsx')
  expect(() =>
    renderToStaticMarkup(
      <Image template="product-images" src={path} width={300} height={200} alt="Chair" />,
    ),
  ).toThrow(/Template inputs.*URL/i)
  expect(project.authorize).not.toHaveBeenCalled()
})

test('a catalog-free template capability is bound to its explicit workspace cryptographically', async () => {
  project.catalog = undefined
  project.authorize = vi.fn(() => true)
  const { Image } = await import('../src/next/react-server.tsx')
  const { GET } = await import('../src/next/route.ts')
  const html = renderToStaticMarkup(
    <Image
      workspace="explicit-shop"
      template="products"
      src="chair.jpg"
      width={300}
      height={200}
      alt="Chair"
    />,
  )
  const url = new URL(source(html), 'https://app.example')
  expect((await GET(new Request(url))).status).toBe(307)
  vi.mocked(project.authorize).mockClear()
  url.searchParams.set('workspace', 'other-shop')
  expect((await GET(new Request(url))).status).toBe(404)
  expect(project.authorize).not.toHaveBeenCalled()
})

test('custom template redirects bind their workspace and template before per-object authorization', async () => {
  const authorize = vi.fn<AuthorizeTransloaditImage>(
    ({ workspace, template, path, request }) =>
      workspace === 'catalog-shop' &&
      template === 'product-images' &&
      path === 'website/hero.jpg' &&
      request.headers.get('authorization') === 'Bearer allowed',
  )
  project.authorize = authorize
  const { Image } = await import('../src/next/react-server.tsx')
  const { GET, HEAD } = await import('../src/next/route.ts')
  const html = renderToStaticMarkup(
    <Image
      template="product-images"
      src="website/hero.jpg"
      width={300}
      height={200}
      alt="Product"
    />,
  )
  const url = new URL(source(html), 'https://app.example')
  expect(url.searchParams.get('template')).toBe('product-images')
  expect(url.searchParams.get('workspace')).toBe('catalog-shop')
  expect((await GET(new Request(url))).status).toBe(404)
  const response = await HEAD(new Request(url, { headers: { authorization: 'Bearer allowed' } }))
  expect(authorize).toHaveBeenCalledTimes(2)
  expect(authorize).toHaveBeenLastCalledWith(
    expect.objectContaining({
      workspace: 'catalog-shop',
      template: 'product-images',
      path: 'website/hero.jpg',
    }),
  )
  expect(response.status).toBe(307)
  const destination = parseSmartCdnUrl(response.headers.get('location') ?? '')
  expect(destination.workspace).toBe('catalog-shop')
  expect(destination.template).toBe('product-images')
  expect(destination.auth).toBeDefined()
  expect(await response.text()).toBe('')
  authorize.mockClear()
  const wrongTemplate = new URL(url)
  wrongTemplate.searchParams.set('template', 'other-images')
  expect((await GET(new Request(wrongTemplate))).status).toBe(404)
  const wrongWorkspace = new URL(url)
  wrongWorkspace.searchParams.set('workspace', 'other-shop')
  expect((await GET(new Request(wrongWorkspace))).status).toBe(404)
  expect(authorize).not.toHaveBeenCalled()
})
