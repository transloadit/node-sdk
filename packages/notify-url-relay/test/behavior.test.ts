import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

import { describe, expect, it } from 'vitest'

import { getSignature, TransloaditNotifyUrlProxy } from '../src/index.ts'
import {
  closeServer,
  json,
  listen,
  parseJsonRecord,
  readBody,
  startRelay,
  waitFor,
} from './helpers.ts'

describe('proxy behavior guards', () => {
  it('dedupes duplicate assembly URLs and avoids duplicate poll loops', async () => {
    const secret = 'foo_secret'
    let upstreamPort = 0
    let pollCount = 0
    let notifyCount = 0
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

      notifyCount += 1
      await readBody(request)
      response.writeHead(200)
      response.end('ok')
      resolveNotify?.()
    })

    const upstreamServer = createServer((request, response) => {
      if (request.method === 'POST' && request.url === '/assemblies') {
        json(response, 200, {
          assembly_url: `http://127.0.0.1:${upstreamPort}/assembly/dupe`,
        })
        return
      }

      if (request.method === 'GET' && request.url === '/assembly/dupe') {
        pollCount += 1
        if (pollCount === 1) {
          json(response, 200, { ok: 'ASSEMBLY_EXECUTING' })
          return
        }

        json(response, 200, { ok: 'ASSEMBLY_COMPLETED', assembly_id: 'dupe' })
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
      { logLevel: 0 },
    )
    const proxyPort = await startRelay(proxy, {
      target: `http://127.0.0.1:${upstreamPort}`,
      pollIntervalMs: 10,
      pollMaxIntervalMs: 100,
      maxPollAttempts: 5,
      maxInFlightPolls: 1,
    })

    try {
      const [responseA, responseB] = await Promise.all([
        fetch(`http://127.0.0.1:${proxyPort}/assemblies`, {
          method: 'POST',
          body: new URLSearchParams({ params: '{}' }),
        }),
        fetch(`http://127.0.0.1:${proxyPort}/assemblies`, {
          method: 'POST',
          body: new URLSearchParams({ params: '{}' }),
        }),
      ])

      expect(responseA.status).toBe(200)
      expect(responseB.status).toBe(200)

      await Promise.race([
        notifyReceived,
        delay(3_000).then(() => {
          throw new Error('Timed out waiting for notify request')
        }),
      ])

      expect(pollCount).toBe(2)
      expect(notifyCount).toBe(1)
    } finally {
      proxy.close()
      await closeServer(notifyServer)
      await closeServer(upstreamServer)
    }
  }, 10_000)

  it('cancels polling on close()', async () => {
    const secret = 'foo_secret'
    let upstreamPort = 0
    let pollCount = 0

    const notifyServer = createServer(async (request, response) => {
      await readBody(request)
      response.writeHead(200)
      response.end('ok')
    })

    const upstreamServer = createServer((request, response) => {
      if (request.method === 'POST' && request.url === '/assemblies') {
        json(response, 200, {
          assembly_url: `http://127.0.0.1:${upstreamPort}/assembly/slow`,
        })
        return
      }

      if (request.method === 'GET' && request.url === '/assembly/slow') {
        pollCount += 1
        json(response, 200, { ok: 'ASSEMBLY_EXECUTING' })
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
      { logLevel: 0 },
    )
    const proxyPort = await startRelay(proxy, {
      target: `http://127.0.0.1:${upstreamPort}`,
      pollIntervalMs: 20,
      pollMaxIntervalMs: 40,
      maxPollAttempts: 100,
      maxInFlightPolls: 1,
    })

    try {
      const createResponse = await fetch(`http://127.0.0.1:${proxyPort}/assemblies`, {
        method: 'POST',
        body: new URLSearchParams({ params: '{}' }),
      })
      expect(createResponse.status).toBe(200)

      await waitFor(() => pollCount >= 1, 2_000, 5, 'Timed out waiting for first polling attempt')

      proxy.close()
      const countAfterClose = pollCount
      await delay(150)

      expect(pollCount).toBe(countAfterClose)
    } finally {
      proxy.close()
      await closeServer(notifyServer)
      await closeServer(upstreamServer)
    }
  }, 10_000)

  it('does not notify on terminal error by default', async () => {
    const secret = 'foo_secret'
    let upstreamPort = 0
    let notifyCount = 0

    const notifyServer = createServer(async (request, response) => {
      notifyCount += 1
      await readBody(request)
      response.writeHead(200)
      response.end('ok')
    })

    const upstreamServer = createServer((request, response) => {
      if (request.method === 'POST' && request.url === '/assemblies') {
        json(response, 200, {
          assembly_url: `http://127.0.0.1:${upstreamPort}/assembly/error`,
        })
        return
      }

      if (request.method === 'GET' && request.url === '/assembly/error') {
        json(response, 200, {
          error: 'ASSEMBLY_CRASHED',
        })
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
      { logLevel: 0 },
    )
    const proxyPort = await startRelay(proxy, {
      target: `http://127.0.0.1:${upstreamPort}`,
      pollIntervalMs: 10,
      pollMaxIntervalMs: 100,
      maxPollAttempts: 5,
    })

    try {
      const createResponse = await fetch(`http://127.0.0.1:${proxyPort}/assemblies`, {
        method: 'POST',
        body: new URLSearchParams({ params: '{}' }),
      })
      expect(createResponse.status).toBe(200)

      await delay(200)
      expect(notifyCount).toBe(0)
    } finally {
      proxy.close()
      await closeServer(notifyServer)
      await closeServer(upstreamServer)
    }
  }, 10_000)

  it('notifies when notifyOnTerminalError is enabled', async () => {
    const secret = 'foo_secret'
    let upstreamPort = 0
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
          assembly_url: `http://127.0.0.1:${upstreamPort}/assembly/error`,
        })
        return
      }

      if (request.method === 'GET' && request.url === '/assembly/error') {
        json(response, 200, {
          error: 'ASSEMBLY_CRASHED',
        })
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
      { logLevel: 0 },
    )
    const proxyPort = await startRelay(proxy, {
      target: `http://127.0.0.1:${upstreamPort}`,
      pollIntervalMs: 10,
      pollMaxIntervalMs: 100,
      maxPollAttempts: 5,
      notifyOnTerminalError: true,
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
          throw new Error('Timed out waiting for terminal-error notify request')
        }),
      ])

      expect(notifyTransloadit).toBeTypeOf('string')
      expect(notifySignature).toBeTypeOf('string')

      if (notifyTransloadit === null || notifySignature === null) {
        throw new Error('Missing notify transloadit/signature payload')
      }

      expect(notifySignature).toBe(getSignature(secret, notifyTransloadit))
      const payload = parseJsonRecord(notifyTransloadit)
      expect(payload.error).toBe('ASSEMBLY_CRASHED')
    } finally {
      proxy.close()
      await closeServer(notifyServer)
      await closeServer(upstreamServer)
    }
  }, 10_000)
})
