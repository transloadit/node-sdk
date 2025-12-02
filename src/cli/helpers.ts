import fs from 'node:fs'
import type { Readable } from 'node:stream'
import type { APIError } from './types.ts'
import { isAPIError } from './types.ts'

export function createReadStream(file: string): Readable {
  if (file === '-') return process.stdin
  return fs.createReadStream(file)
}

export function stream2buf(stream: Readable, cb: (err: Error | null, buf?: Buffer) => void): void {
  let size = 0
  const bufs: Buffer[] = []

  stream.on('error', cb)

  stream.on('readable', () => {
    const chunk = stream.read() as Buffer | null
    if (chunk === null) return

    size += chunk.length
    bufs.push(chunk)
  })

  stream.on('end', () => {
    const buf = Buffer.alloc(size)
    let offset = 0

    for (const b of bufs) {
      b.copy(buf, offset)
      offset += b.length
    }

    cb(null, buf)
  })
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
export type { APIError }

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
