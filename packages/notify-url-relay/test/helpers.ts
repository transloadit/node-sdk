import { once } from 'node:events'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

import type { ProxySettings } from '../src/index.ts'

type RelayLike = {
  run: (opts?: Partial<ProxySettings>) => void
  waitForListenPort: () => Promise<number>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf-8')
}

export async function listen(server: Server): Promise<number> {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Could not resolve server address')
  }
  return address.port
}

export async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve())
  })
}

export function startRelay(
  relay: RelayLike,
  settings: Omit<Partial<ProxySettings>, 'port'> = {},
): Promise<number> {
  relay.run({
    ...settings,
    port: 0,
  })
  return relay.waitForListenPort()
}

export function json(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

export function parseJsonRecord(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value)
  if (!isRecord(parsed)) {
    throw new Error('Expected a JSON object payload.')
  }

  return parsed
}

export async function readJsonRecord(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json()
  if (!isRecord(payload)) {
    throw new Error('Expected JSON response object.')
  }

  return payload
}

export function getSetCookieHeaders(headers: Headers): string[] {
  const maybeGetSetCookie = Reflect.get(headers, 'getSetCookie')
  if (typeof maybeGetSetCookie === 'function') {
    const values = maybeGetSetCookie.call(headers)
    if (Array.isArray(values)) {
      return values.filter((value): value is string => typeof value === 'string')
    }
  }

  const fallback = headers.get('set-cookie')
  return fallback ? [fallback] : []
}

export async function waitFor(
  fn: () => boolean,
  timeoutMs: number,
  intervalMs = 10,
  errorMessage = 'Timed out waiting for condition',
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (fn()) {
      return
    }
    await delay(intervalMs)
  }

  throw new Error(errorMessage)
}
