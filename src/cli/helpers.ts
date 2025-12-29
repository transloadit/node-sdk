import fs from 'node:fs'
import type { Readable } from 'node:stream'
import type { APIError } from './types.ts'
import { isAPIError } from './types.ts'

export function getEnvCredentials(): { authKey: string; authSecret: string } | null {
  const authKey = process.env.TRANSLOADIT_KEY ?? process.env.TRANSLOADIT_AUTH_KEY
  const authSecret = process.env.TRANSLOADIT_SECRET ?? process.env.TRANSLOADIT_AUTH_SECRET

  if (!authKey || !authSecret) return null

  return { authKey, authSecret }
}

export function createReadStream(file: string): Readable {
  if (file === '-') return process.stdin
  return fs.createReadStream(file)
}

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export function formatAPIError(err: unknown): string {
  if (isAPIError(err)) {
    return `${err.error}: ${err.message}`
  }
  if (err instanceof Error) {
    return err.message
  }
  return String(err)
}

// Re-export APIError type for convenience


export function zip<A, B>(listA: A[], listB: B[]): [A, B][]
export function zip<T>(...lists: T[][]): T[][]
export function zip<T>(...lists: T[][]): T[][] {
  const length = Math.max(...lists.map((list) => list.length))
  const result: T[][] = new Array(length)
  for (let i = 0; i < result.length; i++) {
    result[i] = lists.map((list) => list[i] as T)
  }
  return result
}
