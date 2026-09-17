// @vitest-environment happy-dom
import { parseSmartCdnUrl } from '@transloadit/utils/node'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'

vi.mock('next/server.js', () => ({ connection: async () => undefined }))
vi.mock('server-only', () => ({}))

import { createTransloaditImageModel } from '../src/index.ts'
import { createImages } from '../src/next/server.tsx'

const original = {
  workspace: 'my-app',
  asset_id: 'A'.repeat(22),
  version_id: 'B'.repeat(21) + 'A',
  path: 'website/photo.jpg',
  width: 800,
  height: 600,
}

function source(markup: string): string {
  const src = new DOMParser()
    .parseFromString(markup, 'text/html')
    .querySelector('img')
    ?.getAttribute('src')
  if (!src) throw new Error('Expected an image URL')
  return src
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

test('the framework-neutral model sends the actual immutable reference', () => {
  const sign = vi.fn(
    (_request: Parameters<Parameters<typeof createTransloaditImageModel>[1]>[0]) => '/preview.jpg',
  )
  createTransloaditImageModel({ src: original, expiresAt: undefined }, sign)
  expect(sign.mock.calls[0]?.[0]).toMatchObject({
    input: original.asset_id,
    template: 'builtin/storage-preview@0.0.3',
    urlParams: { v: original.version_id },
  })
})

test('a public receipt keeps the exact same URL after rename and changes only on a new version', () => {
  const config = { workspace: 'my-app', public: ['website/'], allowedPathPrefixes: ['website/'] }
  const first = createImages(config)
  const before = source(renderToStaticMarkup(<first.Image src={original} alt="Photo" />))
  const after = source(
    renderToStaticMarkup(
      <first.Image src={{ ...original, path: 'website/renamed.jpg' }} alt="Photo" />,
    ),
  )
  expect(after).toBe(before)
  expect(parseSmartCdnUrl(before)).toMatchObject({
    input: original.asset_id,
    template: 'builtin/public-preview@0.0.2',
    urlParams: { v: original.version_id },
  })
  const updated = source(
    renderToStaticMarkup(
      <first.Image src={{ ...original, version_id: 'C'.repeat(21) + 'A' }} alt="Photo" />,
    ),
  )
  expect(updated).not.toBe(before)
})

test('private capabilities bind both asset and version, independently of a changed catalog', async () => {
  const authorize = vi.fn(() => true)
  const config = {
    workspace: 'my-app',
    authKey: 'key',
    authSecret: 'secret',
    allowedPathPrefixes: ['website/'],
    authorize,
  }
  const first = createImages({ ...config, images: { [original.path]: original } })
  const url = source(renderToStaticMarkup(<first.Image src="website/photo.jpg" alt="Photo" />))
  const newer = createImages({
    ...config,
    images: { [original.path]: { ...original, version_id: 'C'.repeat(21) + 'A' } },
  })
  const response = await newer.imageRoute(new Request(new URL(url, 'https://app.example')))
  expect(response.status).toBe(307)
  expect(parseSmartCdnUrl(response.headers.get('Location') ?? '')).toMatchObject({
    input: original.asset_id,
    urlParams: { v: original.version_id },
  })
  expect(authorize).toHaveBeenCalledWith(
    expect.objectContaining({
      path: original.path,
      asset_id: original.asset_id,
      version_id: original.version_id,
      workspace: 'my-app',
    }),
  )
})

test('Storage rejects missing identity and a receipt from a different Workspace', () => {
  const { Image } = createImages({
    workspace: 'my-app',
    public: ['website/'],
    allowedPathPrefixes: ['website/'],
  })
  expect(() =>
    renderToStaticMarkup(
      <Image src={{ path: original.path, width: 800, height: 600 }} alt="Photo" />,
    ),
  ).toThrow(/receipt.*storage receipts sync/i)
  expect(() =>
    renderToStaticMarkup(<Image src={{ ...original, workspace: 'another-app' }} alt="Photo" />),
  ).toThrow(/Workspace/)
})

test('customer HTTP/S3 Templates retain path inputs and do not receive invented versions', () => {
  const { Image } = createImages({
    workspace: 'my-app',
    template: 'products',
    publicTemplate: 'public-products',
    public: ['website/'],
    allowedPathPrefixes: ['website/'],
  })
  const url = source(
    renderToStaticMarkup(
      <Image src={{ path: original.path, width: 800, height: 600 }} alt="Photo" />,
    ),
  )
  const parsed = parseSmartCdnUrl(url)
  expect(parsed.input).toBe(original.path)
  expect(parsed.urlParams).not.toHaveProperty('v')
})
