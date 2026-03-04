import { once } from 'node:events'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

import { describe, expect, it } from 'vitest'

import TransloaditNotifyUrlProxy, { getSignature } from '../src/index.ts'

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf-8')
}

async function listen(server: Server): Promise<number> {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Could not resolve server address')
  }
  return address.port
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve())
  })
}

async function getFreePort(): Promise<number> {
  const server = createServer()
  const port = await listen(server)
  await closeServer(server)
  return port
}

function json(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

describe('proxy e2e', () => {
  it('proxies assembly creation, polls assembly status, and notifies target', async () => {
    const secret = 'foo_secret'
    let upstreamPort = 0
    let pollCount = 0

    let notifyTransloadit: string | null = null
    let notifySignature: string | null = null
    let resolveNotify: (() => void) | null = null
    const notifyReceived = new Promise<void>((resolve) => {
      resolveNotify = resolve
    })

    const notifyServer = createServer(async (request, response) => {
      if (request.method !== 'POST' || request.url !== '/transloadit') {
        response.writeHead(404)
        response.end()
        return
      }

      const payload = new URLSearchParams(await readBody(request))
      notifyTransloadit = payload.get('transloadit')
      notifySignature = payload.get('signature')
      response.writeHead(200)
      response.end('ok')
      resolveNotify?.()
    })

    const upstreamServer = createServer((request, response) => {
      if (request.method === 'POST' && request.url === '/assemblies') {
        json(response, 200, {
          assembly_url: `http://127.0.0.1:${upstreamPort}/assembly/123`,
        })
        return
      }

      if (request.method === 'GET' && request.url === '/assembly/123') {
        pollCount += 1
        if (pollCount === 1) {
          json(response, 200, { ok: 'ASSEMBLY_EXECUTING' })
          return
        }

        json(response, 200, { ok: 'ASSEMBLY_COMPLETED', assembly_id: '123' })
        return
      }

      response.writeHead(404)
      response.end()
    })

    const notifyPort = await listen(notifyServer)
    upstreamPort = await listen(upstreamServer)
    const proxyPort = await getFreePort()

    const proxy = new TransloaditNotifyUrlProxy(
      secret,
      `http://127.0.0.1:${notifyPort}/transloadit`,
    )
    proxy.run({
      target: `http://127.0.0.1:${upstreamPort}`,
      port: proxyPort,
      pollIntervalMs: 5,
      maxPollAttempts: 5,
    })

    try {
      const createResponse = await fetch(`http://127.0.0.1:${proxyPort}/assemblies`, {
        method: 'POST',
        body: new URLSearchParams({ params: '{}' }),
      })
      expect(createResponse.status).toBe(200)

      await Promise.race([
        notifyReceived,
        delay(3_000).then(() => {
          throw new Error('Timed out waiting for notify request')
        }),
      ])

      expect(pollCount).toBe(2)
      expect(notifyTransloadit).toBeTypeOf('string')
      expect(notifySignature).toBeTypeOf('string')

      if (notifyTransloadit === null || notifySignature === null) {
        throw new Error('Notify payload did not include transloadit + signature fields')
      }

      expect(notifySignature).toBe(getSignature(secret, notifyTransloadit))

      const body = JSON.parse(notifyTransloadit) as { ok?: string }
      expect(body.ok).toBe('ASSEMBLY_COMPLETED')
    } finally {
      proxy.close()
      await closeServer(notifyServer)
      await closeServer(upstreamServer)
    }
  }, 10_000)
})
