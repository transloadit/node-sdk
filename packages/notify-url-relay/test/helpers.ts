import { once } from 'node:events'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

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

export async function getFreePort(): Promise<number> {
  const server = createServer()
  const port = await listen(server)
  await closeServer(server)
  return port
}

export function json(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
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
