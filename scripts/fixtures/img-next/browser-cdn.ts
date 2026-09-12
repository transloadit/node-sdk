import type { IncomingMessage, ServerResponse } from 'node:http'

import assert from 'node:assert/strict'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { once } from 'node:events'
import { createServer } from 'node:http'

import sharp from 'sharp'

import { imageConfiguration } from './app/imageConfiguration.ts'

interface FixtureCdn {
  requests: { url: string; status: number; cookie: string | undefined }[]
  errors: unknown[]
  close(): Promise<void>
}

/** An owned origin with independent HMAC validation and real AVIF/WebP/JPEG response bytes. */
export async function startFixtureCdn(origin: string): Promise<FixtureCdn> {
  const endpoint = new URL(origin)
  assert.equal(endpoint.hostname, 'localhost')
  assert.equal(endpoint.protocol, 'http:')
  const requests: { url: string; status: number; cookie: string | undefined }[] = []
  const errors: unknown[] = []
  const images = new Map<string, Promise<Buffer>>()
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
    const format = url.searchParams.get('f')
    const strategy = url.searchParams.get('r')
    const background = url.searchParams.get('bg') ?? ''
    const mime = format === 'jpg' ? 'image/jpeg' : `image/${format}`
    const accepted =
      authenticated &&
      decodeURIComponent(url.pathname).startsWith('/file/fixture/builtin/storage-preview@0.0.2/') &&
      url.searchParams.get('auth_key') === imageConfiguration.authKey &&
      Number(url.searchParams.get('exp')) > Date.now() &&
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
    const avatar = decodeURIComponent(url.pathname).endsWith('/documents/avatar.jpg')
    const transparent = decodeURIComponent(url.pathname).endsWith('/documents/alpha.png')
    const key = `${avatar}/${transparent}/${width}/${height}/${format}/${strategy}/${background}`
    let bytes = images.get(key)
    if (bytes === undefined) {
      const source = transparent
        ? sharp(transparentSource)
        : sharp({
            create: {
              width: avatar ? 400 : 2400,
              height: avatar ? 300 : 1600,
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
        'Cache-Control': 'no-store',
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
