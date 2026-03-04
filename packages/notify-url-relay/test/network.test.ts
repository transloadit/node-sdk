import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { gzipSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

import TransloaditNotifyUrlProxy from '../src/index.ts'
import { closeServer, getFreePort, json, listen } from './helpers.ts'

describe('proxy network behavior', () => {
  it('streams large upstream response bodies', async () => {
    const upstreamServer = createServer(async (request, response) => {
      if (request.method !== 'GET' || request.url !== '/large') {
        response.writeHead(404)
        response.end()
        return
      }

      response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
      for (let i = 0; i < 256; i += 1) {
        response.write(`chunk-${i.toString().padStart(3, '0')}-`)
        await delay(1)
      }
      response.end('done')
    })

    const upstreamPort = await listen(upstreamServer)
    const proxyPort = await getFreePort()

    const proxy = new TransloaditNotifyUrlProxy('secret', undefined, { logLevel: 0 })
    proxy.run({ target: `http://127.0.0.1:${upstreamPort}`, port: proxyPort })

    try {
      const response = await fetch(`http://127.0.0.1:${proxyPort}/large`)
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body.startsWith('chunk-000-')).toBe(true)
      expect(body.endsWith('done')).toBe(true)
      expect(body.length).toBeGreaterThan(2_000)
    } finally {
      proxy.close()
      await closeServer(upstreamServer)
    }
  }, 10_000)

  it('passes redirects through without following them', async () => {
    const upstreamServer = createServer((request, response) => {
      if (request.url === '/redirect') {
        response.writeHead(302, { location: '/final-destination' })
        response.end()
        return
      }

      response.writeHead(404)
      response.end()
    })

    const upstreamPort = await listen(upstreamServer)
    const proxyPort = await getFreePort()

    const proxy = new TransloaditNotifyUrlProxy('secret', undefined, { logLevel: 0 })
    proxy.run({ target: `http://127.0.0.1:${upstreamPort}`, port: proxyPort })

    try {
      const response = await fetch(`http://127.0.0.1:${proxyPort}/redirect`, { redirect: 'manual' })
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('/final-destination')
    } finally {
      proxy.close()
      await closeServer(upstreamServer)
    }
  })

  it('passes through multiple set-cookie headers', async () => {
    const upstreamServer = createServer((request, response) => {
      if (request.url === '/cookies') {
        response.writeHead(200, {
          'set-cookie': ['a=1; Path=/', 'b=2; Path=/'],
          'content-type': 'text/plain; charset=utf-8',
        })
        response.end('ok')
        return
      }

      response.writeHead(404)
      response.end()
    })

    const upstreamPort = await listen(upstreamServer)
    const proxyPort = await getFreePort()

    const proxy = new TransloaditNotifyUrlProxy('secret', undefined, { logLevel: 0 })
    proxy.run({ target: `http://127.0.0.1:${upstreamPort}`, port: proxyPort })

    try {
      const response = await fetch(`http://127.0.0.1:${proxyPort}/cookies`)
      expect(response.status).toBe(200)

      const headersWithSetCookie = response.headers as Headers & { getSetCookie?: () => string[] }
      const cookies =
        typeof headersWithSetCookie.getSetCookie === 'function'
          ? headersWithSetCookie.getSetCookie()
          : []

      expect(cookies).toEqual(['a=1; Path=/', 'b=2; Path=/'])
    } finally {
      proxy.close()
      await closeServer(upstreamServer)
    }
  })

  it('drops encoding headers when fetch decodes compressed upstream payloads', async () => {
    const payload = JSON.stringify({
      ok: true,
      body: 'x'.repeat(1024),
    })
    const compressed = gzipSync(payload)
    let forwardedAcceptEncoding: string | undefined

    const upstreamServer = createServer((request, response) => {
      if (request.url === '/compressed') {
        forwardedAcceptEncoding =
          typeof request.headers['accept-encoding'] === 'string'
            ? request.headers['accept-encoding']
            : undefined
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'content-encoding': 'gzip',
          'content-length': String(compressed.length),
        })
        response.end(compressed)
        return
      }

      response.writeHead(404)
      response.end()
    })

    const upstreamPort = await listen(upstreamServer)
    const proxyPort = await getFreePort()

    const proxy = new TransloaditNotifyUrlProxy('secret', undefined, { logLevel: 0 })
    proxy.run({ target: `http://127.0.0.1:${upstreamPort}`, port: proxyPort })

    try {
      const response = await fetch(`http://127.0.0.1:${proxyPort}/compressed`)
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body).toBe(payload)
      expect(response.headers.get('content-encoding')).toBeNull()
      expect(response.headers.get('content-length')).toBeNull()
      expect(forwardedAcceptEncoding).toBe('identity')
    } finally {
      proxy.close()
      await closeServer(upstreamServer)
    }
  })

  it('returns timeout code when upstream exceeds forward timeout', async () => {
    const upstreamServer = createServer(async (request, response) => {
      if (request.url === '/slow') {
        await delay(200)
        json(response, 200, { ok: true })
        return
      }

      response.writeHead(404)
      response.end()
    })

    const upstreamPort = await listen(upstreamServer)
    const proxyPort = await getFreePort()

    const proxy = new TransloaditNotifyUrlProxy('secret', undefined, { logLevel: 0 })
    proxy.run({
      target: `http://127.0.0.1:${upstreamPort}`,
      port: proxyPort,
      forwardTimeoutMs: 30,
    })

    try {
      const response = await fetch(`http://127.0.0.1:${proxyPort}/slow`)
      const payload = (await response.json()) as { error?: string }

      expect(response.status).toBe(504)
      expect(response.headers.get('x-notify-proxy-error-code')).toBe('FORWARD_TIMEOUT')
      expect(payload.error).toBe('FORWARD_TIMEOUT')
    } finally {
      proxy.close()
      await closeServer(upstreamServer)
    }
  })

  it('returns upstream-error code when target cannot be reached', async () => {
    const proxyPort = await getFreePort()

    const proxy = new TransloaditNotifyUrlProxy('secret', undefined, { logLevel: 0 })
    proxy.run({
      target: 'http://127.0.0.1:1',
      port: proxyPort,
      forwardTimeoutMs: 200,
    })

    try {
      const response = await fetch(`http://127.0.0.1:${proxyPort}/unreachable`)
      const payload = (await response.json()) as { error?: string }

      expect(response.status).toBe(502)
      expect(response.headers.get('x-notify-proxy-error-code')).toBe('FORWARD_UPSTREAM_ERROR')
      expect(payload.error).toBe('FORWARD_UPSTREAM_ERROR')
    } finally {
      proxy.close()
    }
  })
})
