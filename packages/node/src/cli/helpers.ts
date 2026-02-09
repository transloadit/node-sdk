import fs from 'node:fs'
import fsp from 'node:fs/promises'
import type { Readable } from 'node:stream'
import { isAPIError } from './types.ts'

const MISSING_CREDENTIALS_MESSAGE =
  'Missing credentials. Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET environment variables.'

type EnvCredentials = { authKey: string; authSecret: string }

function getEnvCredentials(): { authKey: string; authSecret: string } | null {
  const authKey = process.env.TRANSLOADIT_KEY ?? process.env.TRANSLOADIT_AUTH_KEY
  const authSecret = process.env.TRANSLOADIT_SECRET ?? process.env.TRANSLOADIT_AUTH_SECRET

  if (!authKey || !authSecret) return null

  return { authKey, authSecret }
}

type RequireEnvCredentialsResult =
  | { ok: true; credentials: EnvCredentials }
  | { ok: false; error: string }

export function requireEnvCredentials(): RequireEnvCredentialsResult {
  const credentials = getEnvCredentials()
  if (credentials == null) return { ok: false, error: MISSING_CREDENTIALS_MESSAGE }
  return { ok: true, credentials }
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

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return ''

  process.stdin.setEncoding('utf8')
  let data = ''

  for await (const chunk of process.stdin) {
    data += chunk
  }

  return data
}

export interface CliInputResult {
  content: string | null
  isStdin: boolean
  path?: string
}

export interface ReadCliInputOptions {
  inputPath?: string
  providedInput?: string
  allowStdinWhenNoPath?: boolean
}

export async function readCliInput(options: ReadCliInputOptions): Promise<CliInputResult> {
  const { inputPath, providedInput, allowStdinWhenNoPath = false } = options
  const canUseProvided = providedInput != null && (inputPath == null || inputPath === '-')

  if (canUseProvided) {
    return { content: providedInput, isStdin: inputPath === '-' || inputPath == null }
  }

  if (inputPath === '-') {
    return { content: await readStdin(), isStdin: true }
  }

  if (inputPath != null) {
    const content = await fsp.readFile(inputPath, 'utf8')
    return { content, isStdin: false, path: inputPath }
  }

  if (allowStdinWhenNoPath && !process.stdin.isTTY) {
    return { content: await readStdin(), isStdin: true }
  }

  return { content: null, isStdin: false }
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

// Re-export APIError type for CLI consumers relying on deep imports.
/** @public */
export type { APIError } from './types.ts'

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
