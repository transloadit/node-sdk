import type { IncomingMessage, ServerResponse } from 'node:http'

import { once } from 'node:events'
import { createServer } from 'node:http'

interface ScriptGate {
  origin: string
  readonly waiting: number
  release(): void
  close(): Promise<void>
}

/** Holds real HTTP responses: pausing intercepted requests can freeze WebKit animation frames. */
export async function startScriptGate(appOrigin: string): Promise<ScriptGate> {
  const released = Promise.withResolvers<void>()
  const errors: unknown[] = []
  const responses: Promise<void>[] = []
  let waiting = 0
  async function respond(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const target = new URL(request.url ?? '/', appOrigin)
    if (
      request.method !== 'GET' ||
      target.origin !== appOrigin ||
      !target.pathname.includes('/_next/static/') ||
      !target.pathname.endsWith('.js')
    ) {
      throw new Error('The fixture gate only serves application JavaScript')
    }
    waiting += 1
    await released.promise
    const upstream = await fetch(target, { signal: AbortSignal.timeout(10_000) })
    if (!upstream.ok) throw new Error(`Fixture bootstrap returned ${upstream.status}`)
    const bytes = Buffer.from(await upstream.arrayBuffer())
    response
      .writeHead(200, {
        'Access-Control-Allow-Origin': appOrigin,
        'Content-Type': 'text/javascript',
        'Content-Length': bytes.length,
      })
      .end(bytes)
  }
  const server = createServer((request, response) => {
    responses.push(
      respond(request, response).catch((error: unknown) => {
        errors.push(error)
        response.writeHead(500).end()
      }),
    )
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Expected script gate port')
  return {
    origin: `http://127.0.0.1:${address.port}`,
    get waiting() {
      return waiting
    },
    release() {
      released.resolve()
    },
    async close() {
      released.resolve()
      await Promise.all(responses)
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
      if (errors.length > 0) throw new AggregateError(errors, 'Fixture script gate failed')
    },
  }
}
