import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import type { Readable } from 'node:stream'
import { parse as parseDotenv } from 'dotenv'
import { isAPIError } from './types.ts'

export type CliKeySecretCredentials = { authKey: string; authSecret: string }
export type CliAuthToken = { authToken: string }
export type CliAuth = CliKeySecretCredentials | CliAuthToken
type CliEnvSource = { values: Record<string, string | undefined> }

type LoadCliEnvSourcesResult = {
  loadError?: string
  sources: CliEnvSource[]
}

export type ResolvedCliConfig = {
  auth?: CliAuth
  credentials?: CliKeySecretCredentials
  endpoint?: string
  loadError?: string
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function getConfiguredCredentialsFilePath(): string {
  const configuredPath = normalizeEnvValue(process.env.TRANSLOADIT_CREDENTIALS_FILE)
  if (configuredPath != null) {
    return path.resolve(configuredPath)
  }

  return path.join(homedir(), '.transloadit', 'credentials')
}

function getProjectDotenvPath(): string {
  return path.resolve(process.cwd(), '.env')
}

function getDisplayPath(filePath: string): string {
  const normalizedHome = path.resolve(homedir())
  const normalizedFilePath = path.resolve(filePath)
  if (normalizedFilePath === normalizedHome) return '~'
  if (normalizedFilePath.startsWith(`${normalizedHome}${path.sep}`)) {
    return `~${normalizedFilePath.slice(normalizedHome.length)}`
  }

  return normalizedFilePath
}

export function buildMissingCredentialsMessage(): string {
  return [
    'Missing credentials.',
    '',
    'Looked for TRANSLOADIT_KEY + TRANSLOADIT_SECRET in this order:',
    '1. Shell env: TRANSLOADIT_KEY / TRANSLOADIT_SECRET',
    `2. Current directory .env: ${getProjectDotenvPath()}`,
    `3. Credentials file: ${getDisplayPath(getConfiguredCredentialsFilePath())}`,
  ].join('\n')
}

export function buildMissingAuthMessage(): string {
  return [
    'Missing authentication.',
    '',
    'Looked for TRANSLOADIT_AUTH_TOKEN or TRANSLOADIT_KEY + TRANSLOADIT_SECRET in this order:',
    '1. Shell env: TRANSLOADIT_AUTH_TOKEN, or TRANSLOADIT_KEY / TRANSLOADIT_SECRET',
    `2. Current directory .env: ${getProjectDotenvPath()}`,
    `3. Credentials file: ${getDisplayPath(getConfiguredCredentialsFilePath())}`,
  ].join('\n')
}

function readEnvFile(
  filePath: string,
): { ok: true; source: CliEnvSource } | { ok: false; error: string } | null {
  if (!fs.existsSync(filePath)) return null

  try {
    return {
      ok: true,
      source: {
        values: parseDotenv(fs.readFileSync(filePath)),
      },
    }
  } catch (err) {
    if (!(err instanceof Error)) {
      throw new Error(`Was thrown a non-error: ${err}`)
    }
    return { ok: false, error: `Failed to read ${filePath}: ${err.message}` }
  }
}

function loadCliEnvSources(): LoadCliEnvSourcesResult {
  const sources: CliEnvSource[] = [{ values: process.env }]
  const loadErrors: string[] = []

  const projectDotenvResult = readEnvFile(getProjectDotenvPath())
  let projectDotenvSource: CliEnvSource | undefined
  if (projectDotenvResult?.ok === true) {
    projectDotenvSource = projectDotenvResult.source
    sources.push(projectDotenvSource)
  } else if (projectDotenvResult?.ok === false) {
    loadErrors.push(projectDotenvResult.error)
  }

  const credentialsFilePath = getConfiguredCredentialsFilePath()
  const credentialsFileResult = readEnvFile(credentialsFilePath)
  if (credentialsFileResult?.ok === true) {
    sources.push(credentialsFileResult.source)
  } else if (credentialsFileResult?.ok === false) {
    loadErrors.push(credentialsFileResult.error)
  } else if (normalizeEnvValue(process.env.TRANSLOADIT_CREDENTIALS_FILE) != null) {
    loadErrors.push(`Configured credentials file does not exist: ${credentialsFilePath}`)
  }

  return {
    sources,
    ...(loadErrors[0] ? { loadError: loadErrors[0] } : {}),
  }
}

function getSourceValue(source: CliEnvSource, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = normalizeEnvValue(source.values[key])
    if (value != null) return value
  }

  return undefined
}

function getSourceKeySecretCredentials(source: CliEnvSource): CliKeySecretCredentials | null {
  const authKey = getSourceValue(source, ['TRANSLOADIT_KEY', 'TRANSLOADIT_AUTH_KEY'])
  const authSecret = getSourceValue(source, ['TRANSLOADIT_SECRET', 'TRANSLOADIT_AUTH_SECRET'])
  if (authKey == null || authSecret == null) return null
  return { authKey, authSecret }
}

function getSourceAuthToken(source: CliEnvSource): CliAuthToken | null {
  const authToken = getSourceValue(source, ['TRANSLOADIT_AUTH_TOKEN'])
  if (authToken == null) return null
  return { authToken }
}

export function resolveCliConfig(): ResolvedCliConfig {
  const { loadError, sources } = loadCliEnvSources()
  let auth: CliAuth | undefined
  let credentials: CliKeySecretCredentials | undefined
  let endpoint: string | undefined

  for (const source of sources) {
    if (endpoint == null) {
      endpoint = getSourceValue(source, ['TRANSLOADIT_ENDPOINT'])
    }

    const sourceCredentials = getSourceKeySecretCredentials(source)
    if (credentials == null && sourceCredentials != null) {
      credentials = sourceCredentials
    }

    if (auth != null) continue

    const authToken = getSourceAuthToken(source)
    if (authToken != null) {
      auth = authToken
      continue
    }
    if (sourceCredentials != null) {
      auth = sourceCredentials
    }
  }

  return {
    ...(auth != null ? { auth } : {}),
    ...(credentials != null ? { credentials } : {}),
    ...(endpoint != null ? { endpoint } : {}),
    ...(loadError != null ? { loadError } : {}),
  }
}

type ResolveCliAuthResult = { ok: true; auth: CliAuth } | { ok: false; error: string }

export function resolveCliEndpoint(): string | undefined {
  return resolveCliConfig().endpoint
}

export function resolveCliAuth(): ResolveCliAuthResult {
  const config = resolveCliConfig()
  if (config.auth != null) return { ok: true, auth: config.auth }

  const { loadError } = config
  if (loadError != null) return { ok: false, error: loadError }
  return { ok: false, error: buildMissingAuthMessage() }
}

type RequireCliCredentialsResult =
  | { ok: true; credentials: CliKeySecretCredentials }
  | { ok: false; error: string }

export function requireCliCredentials(): RequireCliCredentialsResult {
  const { credentials, loadError } = resolveCliConfig()
  if (credentials != null) return { ok: true, credentials }
  if (loadError != null) return { ok: false, error: loadError }
  return { ok: false, error: buildMissingCredentialsMessage() }
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
