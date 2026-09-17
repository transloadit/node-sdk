import type { IncomingMessage, ServerResponse } from 'node:http'

import assert from 'node:assert/strict'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'

import sharp from 'sharp'

import { imageConfiguration } from './app/imageConfiguration.ts'
import { fixtureImages } from './storage-fixtures.ts'

interface FixtureCdn {
  requests: { url: string; status: number; cookie: string | undefined }[]
  errors: unknown[]
  close(): Promise<void>
}

/** An owned origin with independent signature/public-prefix enforcement and real image bytes. */
export async function startFixtureCdn(origin: string): Promise<FixtureCdn> {
  const endpoint = new URL(origin)
  assert.equal(endpoint.hostname, 'localhost')
  assert.equal(endpoint.protocol, 'http:')
  const requests: { url: string; status: number; cookie: string | undefined }[] = []
  const errors: unknown[] = []
  const images = new Map<string, Promise<Buffer>>()
  const catalog: { images: typeof fixtureImages } = JSON.parse(
    await readFile('transloadit.images.json', 'utf8'),
  )
  const assets = new Map(
    Object.values({ ...fixtureImages, ...catalog.images }).map((asset) => [asset.asset_id, asset]),
  )
  const transparentSource = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: {
          create: {
            width: 32,
            height: 32,
            channels: 4,
            background: { r: 45, g: 110, b: 160, alpha: 1 },
          },
        },
        left: 16,
        top: 16,
      },
    ])
    .png()
    .toBuffer()
  async function respond(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', origin)
    const signature = url.searchParams.get('sig')
    url.searchParams.delete('sig')
    url.searchParams.sort()
    const expected = `sha256:${createHmac('sha256', imageConfiguration.authSecret)
      .update(`${url.pathname.slice('/file/'.length)}?${url.searchParams}`)
      .digest('hex')}`
    const authenticated =
      signature !== null &&
      /^sha256:[a-f0-9]{64}$/.test(signature) &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    const width = Number(url.searchParams.get('w'))
    const height = Number(url.searchParams.get('h'))
    // Mirror the verified defaults of the two pinned API2 preview Built-ins.
    const format = url.searchParams.get('f') ?? 'jpg'
    const strategy = url.searchParams.get('r') ?? 'pad'
    const background = url.searchParams.get('bg') ?? '#ffffff'
    const mime = format === 'jpg' ? 'image/jpeg' : `image/${format}`
    const path = decodeURIComponent(url.pathname)
    const publicTemplate = '/file/fixture/builtin/public-preview@0.0.2/'
    const privateTemplate = '/file/fixture/builtin/storage-preview@0.0.3/'
    // Only these configured source adapters participate in the experiment. This is a delivery
    // protocol fake with real image bytes, not evidence of HTTP or S3 import execution by API2.
    const configuredSource =
      path.startsWith('/file/fixture/fixture-http/website/') ||
      path.startsWith('/file/fixture/fixture-s3/products/')
    const isPublicTemplate = path.startsWith(publicTemplate)
    const asset = assets.get(
      path.slice((isPublicTemplate ? publicTemplate : privateTemplate).length),
    )
    const published =
      isPublicTemplate &&
      ['website/', 'documents/public/'].some((prefix) => asset?.path.startsWith(prefix))
    const validSignature =
      authenticated &&
      url.searchParams.get('auth_key') === imageConfiguration.authKey &&
      Number(url.searchParams.get('exp')) > Date.now()
    // A supplied bad signature must never fall through to anonymous public delivery.
    const authorized = signature !== null ? validSignature : published
    const version = url.searchParams.get('v')
    const accepted =
      (isPublicTemplate || path.startsWith(privateTemplate) || configuredSource) &&
      authorized &&
      (configuredSource ? version === null : asset !== undefined && version === asset.version_id) &&
      Number.isSafeInteger(width) &&
      width > 0 &&
      width <= 2400 &&
      Number.isSafeInteger(height) &&
      height > 0 &&
      height <= 2400 &&
      (strategy === 'pad' || strategy === 'fillcrop') &&
      (format === 'avif' || format === 'webp' || format === 'png' || format === 'jpg') &&
      (format === 'jpg' ? /^#[0-9a-f]{6}(?:ff)?$/i.test(background) : background === '#00000000')
    requests.push({
      url: new URL(request.url ?? '/', origin).href,
      status: accepted ? 200 : 403,
      cookie: request.headers.cookie,
    })
    if (!accepted) {
      response.writeHead(403, { 'Cache-Control': 'no-store' }).end()
      return
    }
    const avatar = asset?.path === 'documents/avatar.jpg'
    const small = asset?.path === 'website/small.jpg'
    const transparent = asset?.path === 'documents/alpha.png' || asset?.path === 'website/alpha.png'
    const key = `${avatar}/${small}/${transparent}/${width}/${height}/${format}/${strategy}/${background}`
    let bytes = images.get(key)
    if (bytes === undefined) {
      const source = transparent
        ? sharp(transparentSource)
        : sharp({
            create: {
              width: small ? 320 : avatar ? 400 : 2400,
              height: small ? 240 : avatar ? 300 : 1600,
              channels: 3,
              background: { r: 45, g: 110, b: 160 },
            },
          })
      const image = source.resize(width, height, {
        fit: strategy === 'fillcrop' ? 'cover' : 'contain',
        background,
      })
      bytes = (
        format === 'avif'
          ? image.avif()
          : format === 'webp'
            ? image.webp()
            : format === 'png'
              ? image.png()
              : image.flatten({ background }).jpeg()
      ).toBuffer()
      images.set(key, bytes)
    }
    const body = await bytes
    response
      .writeHead(200, {
        'Cache-Control': isPublicTemplate
          ? 'public, max-age=31536000, s-maxage=31536000, immutable'
          : 'no-store',
        'Content-Type': mime,
        'Content-Length': body.length,
      })
      .end(body)
  }
  const server = createServer((request, response) => {
    respond(request, response).catch((error: unknown) => {
      errors.push(error)
      response.writeHead(500).end()
    })
  })
  server.listen(Number(endpoint.port), '127.0.0.1')
  await once(server, 'listening')
  return {
    requests,
    errors,
    async close(): Promise<void> {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    },
  }
}
