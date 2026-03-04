import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { Transloadit } from 'transloadit'
import { describe, expect, it } from 'vitest'

import TransloaditNotifyUrlProxy, { getSignature } from '../src/index.ts'
import { closeServer, getFreePort, listen, readBody } from './helpers.ts'

if (typeof process.loadEnvFile === 'function' && existsSync('.env')) {
  process.loadEnvFile('.env')
}

const runReal =
  process.env.RUN_REAL_E2E === '1' &&
  typeof process.env.TRANSLOADIT_KEY === 'string' &&
  process.env.TRANSLOADIT_KEY.length > 0 &&
  typeof process.env.TRANSLOADIT_SECRET === 'string' &&
  process.env.TRANSLOADIT_SECRET.length > 0

const describeReal = runReal ? describe : describe.skip

describeReal('real api e2e', () => {
  it('creates a real assembly through the proxy and receives signed notify callback', async () => {
    const secret = process.env.TRANSLOADIT_SECRET as string
    const authKey = process.env.TRANSLOADIT_KEY as string
    const endpoint = (process.env.TRANSLOADIT_ENDPOINT || 'https://api2.transloadit.com').replace(
      /\/$/,
      '',
    )

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

    const notifyPort = await listen(notifyServer)
    const proxyPort = await getFreePort()

    const proxy = new TransloaditNotifyUrlProxy(
      secret,
      `http://127.0.0.1:${notifyPort}/transloadit`,
    )
    proxy.run({
      target: endpoint,
      port: proxyPort,
      pollIntervalMs: 1_000,
      maxPollAttempts: 120,
    })

    const client = new Transloadit({
      authKey,
      authSecret: secret,
      endpoint: `http://127.0.0.1:${proxyPort}`,
    })

    try {
      const createPromise = client.createAssembly({
        uploads: {
          probe: Buffer.from(`notify-url-relay-real-e2e-${Date.now()}`, 'utf-8'),
        },
        params: {
          steps: {
            ':original': { robot: '/upload/handle' },
          },
        },
        waitForCompletion: false,
        timeout: 120_000,
      })
      const createdAssemblyId = createPromise.assemblyId
      expect(typeof createdAssemblyId).toBe('string')
      expect(createdAssemblyId.length).toBeGreaterThan(0)
      await createPromise

      await Promise.race([
        notifyReceived,
        delay(180_000).then(() => {
          throw new Error('Timed out waiting for notify callback from proxy')
        }),
      ])

      expect(notifyTransloadit).toBeTypeOf('string')
      expect(notifySignature).toBeTypeOf('string')
      if (notifyTransloadit === null || notifySignature === null) {
        throw new Error('Notify payload did not include transloadit + signature fields')
      }

      expect(notifySignature).toBe(getSignature(secret, notifyTransloadit))

      const payload = JSON.parse(notifyTransloadit) as { assembly_id?: string; ok?: string }
      expect(payload.assembly_id).toBe(createdAssemblyId)
      expect(payload.ok).toBe('ASSEMBLY_COMPLETED')
    } finally {
      proxy.close()
      await closeServer(notifyServer)
    }
  }, 210_000)
})
