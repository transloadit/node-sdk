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
type CliEnvSource = {
  name: 'env' | 'credentialsFile'
  values: Record<string, string | undefined>
}

let loadedProjectDotenvPath: string | undefined
let projectDotenvInjectedValues: Record<string, string> | undefined
let projectDotenvPreviousValues: Record<string, string | undefined> | undefined
let shellEnvBeforeProjectDotenv: Record<string, string | undefined> | undefined

type LoadCliEnvSourcesResult = {
  loadError?: string
  shellEnvSource: CliEnvSource
  sources: CliEnvSource[]
}

export type ResolvedCliConfig = {
  auth?: CliAuth
  credentials?: CliKeySecretCredentials
  credentialsEndpoint?: string
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
        name: 'credentialsFile',
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

export function loadProjectDotenvIntoProcessEnv(): string | undefined {
  const projectDotenvPath = getProjectDotenvPath()
  if (loadedProjectDotenvPath !== projectDotenvPath) {
    restoreProjectDotenvFromProcessEnv()
    shellEnvBeforeProjectDotenv = { ...process.env }
    loadedProjectDotenvPath = projectDotenvPath
  }

  const projectDotenvResult = readEnvFile(projectDotenvPath)
  if (projectDotenvResult == null) {
    restoreProjectDotenvFromProcessEnv()
    projectDotenvInjectedValues = undefined
    projectDotenvPreviousValues = undefined
    return undefined
  }

  if (!projectDotenvResult.ok) return projectDotenvResult.error
  if (projectDotenvInjectedValues != null) return undefined

  const previousValues: Record<string, string | undefined> = {}
  const injectedValues: Record<string, string> = {}
  for (const [key, value] of Object.entries(projectDotenvResult.source.values)) {
    if (value == null) continue
    if (normalizeEnvValue(process.env[key]) != null) continue
    previousValues[key] = process.env[key]
    process.env[key] = value
    injectedValues[key] = value
  }

  projectDotenvPreviousValues = previousValues
  projectDotenvInjectedValues = injectedValues
  return undefined
}

function getShellEnvValues(): Record<string, string | undefined> {
  if (loadedProjectDotenvPath === getProjectDotenvPath() && shellEnvBeforeProjectDotenv != null) {
    return shellEnvBeforeProjectDotenv
  }

  return { ...process.env }
}

function restoreProjectDotenvFromProcessEnv(): void {
  if (projectDotenvInjectedValues == null || projectDotenvPreviousValues == null) return

  for (const [key, injectedValue] of Object.entries(projectDotenvInjectedValues)) {
    if (process.env[key] !== injectedValue) continue

    const previousValue = projectDotenvPreviousValues[key]
    if (previousValue == null) {
      delete process.env[key]
      continue
    }

    process.env[key] = previousValue
  }

  projectDotenvInjectedValues = undefined
  projectDotenvPreviousValues = undefined
}

function loadCliEnvSources(): LoadCliEnvSourcesResult {
  const shellEnvSource: CliEnvSource = {
    name: 'env',
    values: getShellEnvValues(),
  }
  const loadErrors: string[] = []

  const projectDotenvLoadError = loadProjectDotenvIntoProcessEnv()
  if (projectDotenvLoadError != null) {
    loadErrors.push(projectDotenvLoadError)
  }

  const sources: CliEnvSource[] = [
    {
      name: 'env',
      values: { ...process.env },
    },
  ]

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
    shellEnvSource,
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

function getSourceCredentials(source: CliEnvSource): CliKeySecretCredentials | undefined {
  const authKey = getSourceValue(source, ['TRANSLOADIT_KEY', 'TRANSLOADIT_AUTH_KEY'])
  const authSecret = getSourceValue(source, ['TRANSLOADIT_SECRET', 'TRANSLOADIT_AUTH_SECRET'])
  if (authKey == null || authSecret == null) return undefined

  return { authKey, authSecret }
}

function getSourceAuthToken(source: CliEnvSource): CliAuthToken | undefined {
  const authToken = getSourceValue(source, ['TRANSLOADIT_AUTH_TOKEN'])
  if (authToken == null) return undefined

  return { authToken }
}

function resolveEndpointForSource(
  source: CliEnvSource | undefined,
  shellEnvSource: CliEnvSource,
): string | undefined {
  const shellEndpoint = getSourceValue(shellEnvSource, ['TRANSLOADIT_ENDPOINT'])
  if (shellEndpoint != null) return shellEndpoint
  if (source == null) return undefined

  return getSourceValue(source, ['TRANSLOADIT_ENDPOINT'])
}

export function resolveCliConfig(): ResolvedCliConfig {
  const { loadError, shellEnvSource, sources } = loadCliEnvSources()
  let auth: CliAuth | undefined
  let authSource: CliEnvSource | undefined
  let credentials: CliKeySecretCredentials | undefined
  let credentialsSource: CliEnvSource | undefined

  for (const source of sources) {
    if (auth == null) {
      const authToken = getSourceAuthToken(source)
      if (authToken != null) {
        auth = authToken
        authSource = source
      } else {
        const sourceCredentials = getSourceCredentials(source)
        if (sourceCredentials != null) {
          auth = sourceCredentials
          authSource = source
        }
      }
    }

    if (credentials != null) continue

    const sourceCredentials = getSourceCredentials(source)
    if (sourceCredentials != null) {
      credentials = sourceCredentials
      credentialsSource = source
    }
  }

  return {
    ...(auth != null ? { auth } : {}),
    ...(credentials != null ? { credentials } : {}),
    ...(authSource != null
      ? { endpoint: resolveEndpointForSource(authSource, shellEnvSource) }
      : {}),
    ...(credentialsSource != null
      ? { credentialsEndpoint: resolveEndpointForSource(credentialsSource, shellEnvSource) }
      : {}),
    ...(loadError != null ? { loadError } : {}),
  }
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
