import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

import { describe, expect, it } from 'vitest'

import TransloaditNotifyUrlProxy, { type CounterMetricEvent } from '../src/index.ts'
import { closeServer, getFreePort, json, listen, readBody, waitFor } from './helpers.ts'

describe('proxy chaos retries', () => {
  it('handles flaky polling upstream and still notifies', async () => {
    const counters: Record<string, number> = {}
    const onCounter = (event: CounterMetricEvent): void => {
      counters[event.name] = event.total
    }

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
          assembly_url: `http://127.0.0.1:${upstreamPort}/assembly/flaky`,
        })
        return
      }

      if (request.method === 'GET' && request.url === '/assembly/flaky') {
        pollCount += 1
        if (pollCount <= 2) {
          json(response, 500, { error: 'TEMP_ERROR' })
          return
        }
        if (pollCount <= 4) {
          json(response, 200, { ok: 'ASSEMBLY_EXECUTING' })
          return
        }

        json(response, 200, { ok: 'ASSEMBLY_COMPLETED', assembly_id: 'flaky' })
        return
      }

      response.writeHead(404)
      response.end()
    })

    const notifyPort = await listen(notifyServer)
    upstreamPort = await listen(upstreamServer)
    const proxyPort = await getFreePort()

    const proxy = new TransloaditNotifyUrlProxy(
      'secret',
      `http://127.0.0.1:${notifyPort}/transloadit`,
      {
        logLevel: 0,
        metricsHooks: { onCounter },
      },
    )
    proxy.run({
      target: `http://127.0.0.1:${upstreamPort}`,
      port: proxyPort,
      pollIntervalMs: 10,
      pollMaxIntervalMs: 50,
      maxPollAttempts: 8,
      pollRequestTimeoutMs: 300,
    })

    try {
      const createResponse = await fetch(`http://127.0.0.1:${proxyPort}/assemblies`, {
        method: 'POST',
        body: new URLSearchParams({ params: '{}' }),
      })
      expect(createResponse.status).toBe(200)

      await Promise.race([
        notifyReceived,
        delay(5_000).then(() => {
          throw new Error('Timed out waiting for flaky polling notify')
        }),
      ])
      await waitFor(
        () => (counters['notify.success_total'] ?? 0) >= 1,
        1_000,
        10,
        'Timed out waiting for notify.success_total update',
      )

      expect(notifyCount).toBe(1)
      expect(pollCount).toBeGreaterThanOrEqual(5)
      expect(counters['poll.retry_total'] ?? 0).toBeGreaterThanOrEqual(3)
      expect(counters['notify.success_total'] ?? 0).toBe(1)
    } finally {
      proxy.close()
      await closeServer(notifyServer)
      await closeServer(upstreamServer)
    }
  }, 12_000)

  it('retries flaky notify endpoint until success', async () => {
    const counters: Record<string, number> = {}
    const onCounter = (event: CounterMetricEvent): void => {
      counters[event.name] = event.total
    }

    let upstreamPort = 0
    let notifyAttempts = 0
    let resolveNotify: (() => void) | null = null
    const notifyDone = new Promise<void>((resolve) => {
      resolveNotify = resolve
    })

    const notifyServer = createServer(async (request, response) => {
      if (request.method !== 'POST' || request.url !== '/transloadit') {
        response.writeHead(404)
        response.end()
        return
      }

      notifyAttempts += 1
      await readBody(request)

      if (notifyAttempts < 3) {
        response.writeHead(500)
        response.end('retry me')
        return
      }

      response.writeHead(200)
      response.end('ok')
      resolveNotify?.()
    })

    const upstreamServer = createServer((request, response) => {
      if (request.method === 'POST' && request.url === '/assemblies') {
        json(response, 200, {
          assembly_url: `http://127.0.0.1:${upstreamPort}/assembly/notify-flaky`,
        })
        return
      }

      if (request.method === 'GET' && request.url === '/assembly/notify-flaky') {
        json(response, 200, { ok: 'ASSEMBLY_COMPLETED', assembly_id: 'notify-flaky' })
        return
      }

      response.writeHead(404)
      response.end()
    })

    const notifyPort = await listen(notifyServer)
    upstreamPort = await listen(upstreamServer)
    const proxyPort = await getFreePort()

    const proxy = new TransloaditNotifyUrlProxy(
      'secret',
      `http://127.0.0.1:${notifyPort}/transloadit`,
      {
        logLevel: 0,
        metricsHooks: { onCounter },
      },
    )
    proxy.run({
      target: `http://127.0.0.1:${upstreamPort}`,
      port: proxyPort,
      pollIntervalMs: 5,
      pollMaxIntervalMs: 20,
      notifyIntervalMs: 10,
      notifyMaxIntervalMs: 40,
      notifyBackoffFactor: 2,
      notifyMaxAttempts: 5,
      notifyTimeoutMs: 300,
    })

    try {
      const createResponse = await fetch(`http://127.0.0.1:${proxyPort}/assemblies`, {
        method: 'POST',
        body: new URLSearchParams({ params: '{}' }),
      })
      expect(createResponse.status).toBe(200)

      await Promise.race([
        notifyDone,
        delay(5_000).then(() => {
          throw new Error('Timed out waiting for flaky notify success')
        }),
      ])
      await waitFor(
        () => (counters['notify.success_total'] ?? 0) >= 1,
        1_000,
        10,
        'Timed out waiting for notify.success_total update',
      )

      expect(notifyAttempts).toBe(3)
      expect(counters['notify.retry_total'] ?? 0).toBeGreaterThanOrEqual(2)
      expect(counters['notify.success_total'] ?? 0).toBe(1)
    } finally {
      proxy.close()
      await closeServer(notifyServer)
      await closeServer(upstreamServer)
    }
  }, 12_000)
})
