import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

import { describe, expect, it } from 'vitest'

import { getSignature, TransloaditNotifyUrlProxy } from '../src/index.ts'
import { closeServer, json, listen, parseJsonRecord, readBody, startRelay } from './helpers.ts'

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

    const proxy = new TransloaditNotifyUrlProxy(
      secret,
      `http://127.0.0.1:${notifyPort}/transloadit`,
    )
    const proxyPort = await startRelay(proxy, {
      target: `http://127.0.0.1:${upstreamPort}`,
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

      const body = parseJsonRecord(notifyTransloadit)
      expect(body.ok).toBe('ASSEMBLY_COMPLETED')
    } finally {
      proxy.close()
      await closeServer(notifyServer)
      await closeServer(upstreamServer)
    }
  }, 10_000)
})
