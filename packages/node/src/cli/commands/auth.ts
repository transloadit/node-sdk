import process from 'node:process'
import { Command, Option } from 'clipanion'
import type { ZodIssue } from 'zod'
import { z } from 'zod'
import {
  assemblyAuthInstructionsSchema,
  assemblyInstructionsSchema,
} from '../../alphalib/types/template.ts'
import type { OptionalAuthParams } from '../../apiTypes.ts'
import { Transloadit } from '../../Transloadit.ts'
import { getEnvCredentials, readCliInput } from '../helpers.ts'
import { UnauthenticatedCommand } from './BaseCommand.ts'

type UrlParamPrimitive = string | number | boolean
type UrlParamArray = UrlParamPrimitive[]
type NormalizedUrlParams = Record<string, UrlParamPrimitive | UrlParamArray>

const MISSING_CREDENTIALS_MESSAGE =
  'Missing credentials. Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET environment variables.'

const smartCdnParamsSchema = z
  .object({
    workspace: z.string().min(1, 'workspace is required'),
    template: z.string().min(1, 'template is required'),
    input: z.union([z.string(), z.number(), z.boolean()]),
    url_params: z.record(z.unknown()).optional(),
    expire_at_ms: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough()

const cliSignatureParamsSchema = assemblyInstructionsSchema
  .extend({ auth: assemblyAuthInstructionsSchema.partial().optional() })
  .partial()
  .passthrough()

type CliSignatureParams = z.infer<typeof cliSignatureParamsSchema>

function formatIssues(issues: ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.join('.') || '(root)'
      return `${path}: ${issue.message}`
    })
    .join('; ')
}

function normalizeUrlParam(value: unknown): UrlParamPrimitive | UrlParamArray | undefined {
  if (value == null) return undefined
  if (Array.isArray(value)) {
    const normalized = value.filter(
      (item): item is UrlParamPrimitive =>
        typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
    )
    return normalized.length > 0 ? normalized : undefined
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return undefined
}

function normalizeUrlParams(params?: Record<string, unknown>): NormalizedUrlParams | undefined {
  if (params == null) return undefined
  let normalized: NormalizedUrlParams | undefined
  for (const [key, value] of Object.entries(params)) {
    const normalizedValue = normalizeUrlParam(value)
    if (normalizedValue === undefined) continue
    if (normalized == null) normalized = {}
    normalized[key] = normalizedValue
  }
  return normalized
}

const getCredentials = getEnvCredentials

// Result type for signature operations
type SigResult = { ok: true; output: string } | { ok: false; error: string }

const requireCredentials = ():
  | { ok: true; credentials: { authKey: string; authSecret: string } }
  | { ok: false; error: string } => {
  const credentials = getCredentials()
  if (credentials == null) return { ok: false, error: MISSING_CREDENTIALS_MESSAGE }
  return { ok: true, credentials }
}

// Core logic for signature generation
function generateSignature(
  input: string,
  credentials: { authKey: string; authSecret: string },
  algorithm?: string,
): SigResult {
  const { authKey, authSecret } = credentials
  let params: CliSignatureParams

  if (input === '') {
    params = { auth: { key: authKey } }
  } else {
    let parsed: unknown
    try {
      parsed = JSON.parse(input)
    } catch (error) {
      return { ok: false, error: `Failed to parse JSON from stdin: ${(error as Error).message}` }
    }

    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Invalid params provided via stdin. Expected a JSON object.' }
    }

    const parsedResult = cliSignatureParamsSchema.safeParse(parsed)
    if (!parsedResult.success) {
      return { ok: false, error: `Invalid params: ${formatIssues(parsedResult.error.issues)}` }
    }

    const parsedParams = parsedResult.data
    const existingAuth = parsedParams.auth ?? {}

    params = {
      ...parsedParams,
      auth: {
        ...existingAuth,
        key: authKey,
      },
    }
  }

  const client = new Transloadit({ authKey, authSecret })
  try {
    const signature = client.calcSignature(params as OptionalAuthParams, algorithm)
    return { ok: true, output: JSON.stringify(signature) }
  } catch (error) {
    return { ok: false, error: `Failed to generate signature: ${(error as Error).message}` }
  }
}

// Core logic for Smart CDN URL generation
function generateSmartCdnUrl(
  input: string,
  credentials: { authKey: string; authSecret: string },
): SigResult {
  const { authKey, authSecret } = credentials

  if (input === '') {
    return {
      ok: false,
      error:
        'Missing params provided via stdin. Expected a JSON object with workspace, template, input, and optional Smart CDN parameters.',
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (error) {
    return { ok: false, error: `Failed to parse JSON from stdin: ${(error as Error).message}` }
  }

  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Invalid params provided via stdin. Expected a JSON object.' }
  }

  const parsedResult = smartCdnParamsSchema.safeParse(parsed)
  if (!parsedResult.success) {
    return { ok: false, error: `Invalid params: ${formatIssues(parsedResult.error.issues)}` }
  }

  const { workspace, template, input: inputFieldRaw, url_params, expire_at_ms } = parsedResult.data
  const urlParams = normalizeUrlParams(url_params)

  let expiresAt: number | undefined
  if (typeof expire_at_ms === 'string') {
    const parsedNumber = Number.parseInt(expire_at_ms, 10)
    if (Number.isNaN(parsedNumber)) {
      return { ok: false, error: 'Invalid params: expire_at_ms must be a number.' }
    }
    expiresAt = parsedNumber
  } else {
    expiresAt = expire_at_ms
  }

  const inputField = typeof inputFieldRaw === 'string' ? inputFieldRaw : String(inputFieldRaw)

  const client = new Transloadit({ authKey, authSecret })
  try {
    const signedUrl = client.getSignedSmartCDNUrl({
      workspace,
      template,
      input: inputField,
      urlParams,
      expiresAt,
    })
    return { ok: true, output: signedUrl }
  } catch (error) {
    return { ok: false, error: `Failed to generate Smart CDN URL: ${(error as Error).message}` }
  }
}

// Testable helper functions exported for unit tests
export interface RunSigOptions {
  providedInput?: string
  algorithm?: string
}

export interface RunSmartSigOptions {
  providedInput?: string
}

export interface RequestTokenOptions {
  endpoint?: string
  aud?: string
}

const tokenErrorSchema = z
  .object({
    error: z.string(),
    message: z.string().optional(),
  })
  .passthrough()

const buildBasicAuthHeaderValue = (credentials: { authKey: string; authSecret: string }): string =>
  `Basic ${Buffer.from(`${credentials.authKey}:${credentials.authSecret}`, 'utf8').toString('base64')}`

const isLocalhost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'

type TokenBaseResult = { ok: true; baseUrl: URL } | { ok: false; error: string }

const normalizeTokenBaseEndpoint = (raw?: string): TokenBaseResult => {
  const baseRaw = (raw || process.env.TRANSLOADIT_ENDPOINT || 'https://api2.transloadit.com').trim()

  let url: URL
  try {
    url = new URL(baseRaw)
  } catch {
    return { ok: false, error: `Invalid endpoint URL: ${baseRaw}` }
  }

  if (url.username || url.password) {
    return { ok: false, error: 'Endpoint must not include username/password.' }
  }
  if (url.search || url.hash) {
    return { ok: false, error: 'Endpoint must not include query string or hash.' }
  }

  if (url.protocol !== 'https:') {
    if (url.protocol === 'http:' && isLocalhost(url.hostname)) {
      // Allowed for local development only.
    } else {
      return {
        ok: false,
        error:
          'Refusing to send credentials to a non-HTTPS endpoint. Use https://... (or http://localhost for local development).',
      }
    }
  }

  // If someone pasted the token URL, normalize it back to the API base to avoid /token/token.
  const pathLower = url.pathname.toLowerCase()
  if (pathLower === '/token' || pathLower === '/token/') {
    url.pathname = '/'
  }

  return { ok: true, baseUrl: url }
}

const buildTokenEndpointUrl = (baseUrl: URL): string => {
  const base = baseUrl.toString()
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return new URL('token', normalizedBase).toString()
}

async function requestTokenWithCredentials(
  credentials: { authKey: string; authSecret: string },
  options: RequestTokenOptions = {},
): Promise<SigResult> {
  const endpointResult = normalizeTokenBaseEndpoint(options.endpoint)
  if (!endpointResult.ok) {
    return { ok: false, error: endpointResult.error }
  }

  const url = buildTokenEndpointUrl(endpointResult.baseUrl)
  const aud = (options.aud ?? 'mcp').trim() || 'mcp'

  const body = new URLSearchParams({ grant_type: 'client_credentials', aud }).toString()

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      // Never follow redirects with Basic Auth credentials.
      redirect: 'error',
      headers: {
        Authorization: buildBasicAuthHeaderValue(credentials),
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Failed to mint bearer token: ${message}` }
  }

  const text = await res.text()
  if (res.ok) {
    const trimmed = text.trim()
    try {
      JSON.parse(trimmed)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: `Token response was not valid JSON: ${message}` }
    }
    return { ok: true, output: trimmed }
  }

  let parsedJson: unknown = null
  try {
    parsedJson = JSON.parse(text)
  } catch {
    parsedJson = null
  }
  const parsed = tokenErrorSchema.safeParse(parsedJson)
  if (parsed.success) {
    return {
      ok: false,
      error: parsed.data.message
        ? `${parsed.data.error}: ${parsed.data.message}`
        : parsed.data.error,
    }
  }

  return { ok: false, error: `Token request failed (${res.status}): ${text || res.statusText}` }
}

export async function runSig(options: RunSigOptions = {}): Promise<void> {
  const credentialsResult = requireCredentials()
  if (!credentialsResult.ok) {
    console.error(credentialsResult.error)
    process.exitCode = 1
    return
  }
  const credentials = credentialsResult.credentials

  const { content } = await readCliInput({
    providedInput: options.providedInput,
    allowStdinWhenNoPath: true,
  })
  const rawInput = (content ?? '').trim()
  const result = generateSignature(rawInput, credentials, options.algorithm)

  if (result.ok) {
    process.stdout.write(`${result.output}\n`)
  } else {
    console.error(result.error)
    process.exitCode = 1
  }
}

export async function runSmartSig(options: RunSmartSigOptions = {}): Promise<void> {
  const credentialsResult = requireCredentials()
  if (!credentialsResult.ok) {
    console.error(credentialsResult.error)
    process.exitCode = 1
    return
  }
  const credentials = credentialsResult.credentials

  const { content } = await readCliInput({
    providedInput: options.providedInput,
    allowStdinWhenNoPath: true,
  })
  const rawInput = (content ?? '').trim()
  const result = generateSmartCdnUrl(rawInput, credentials)

  if (result.ok) {
    process.stdout.write(`${result.output}\n`)
  } else {
    console.error(result.error)
    process.exitCode = 1
  }
}

/**
 * Generate a signature for assembly params
 */
export class SignatureCommand extends UnauthenticatedCommand {
  static override paths = [
    ['auth', 'signature'],
    ['auth', 'sig'],
    ['signature'],
    ['sig'], // BC alias
  ]

  static override usage = Command.Usage({
    category: 'Auth',
    description: 'Generate a signature for assembly params',
    details: `
      Read params JSON from stdin and output signed payload JSON.
      If no input is provided, generates a signature with default params.
    `,
    examples: [
      ['Generate signature', 'echo \'{"steps":{}}\' | transloadit signature'],
      ['With algorithm', 'echo \'{"steps":{}}\' | transloadit signature --algorithm sha384'],
      ['Using alias', 'echo \'{"steps":{}}\' | transloadit sig'],
    ],
  })

  algorithm = Option.String('--algorithm,-a', {
    description: 'Signature algorithm to use (sha1, sha256, sha384, sha512)',
  })

  protected async run(): Promise<number | undefined> {
    const credentialsResult = requireCredentials()
    if (!credentialsResult.ok) {
      this.output.error(credentialsResult.error)
      return 1
    }
    const credentials = credentialsResult.credentials

    const { content } = await readCliInput({ allowStdinWhenNoPath: true })
    const rawInput = (content ?? '').trim()
    const result = generateSignature(rawInput, credentials, this.algorithm)

    if (result.ok) {
      process.stdout.write(`${result.output}\n`)
      return undefined
    }

    this.output.error(result.error)
    return 1
  }
}

/**
 * Generate a signed Smart CDN URL
 */
export class SmartCdnSignatureCommand extends UnauthenticatedCommand {
  static override paths = [
    ['auth', 'smart-cdn'],
    ['auth', 'smart_cdn'],
    ['smart-cdn'],
    ['smart_sig'], // BC alias
  ]

  static override usage = Command.Usage({
    category: 'Auth',
    description: 'Generate a signed Smart CDN URL',
    details: `
      Read Smart CDN params JSON from stdin and output a signed URL.
      Required fields: workspace, template, input
      Optional fields: expire_at_ms, url_params
    `,
    examples: [
      [
        'Generate Smart CDN URL',
        'echo \'{"workspace":"w","template":"t","input":"i"}\' | transloadit smart-cdn',
      ],
      [
        'Using alias',
        'echo \'{"workspace":"w","template":"t","input":"i"}\' | transloadit smart_sig',
      ],
    ],
  })

  protected async run(): Promise<number | undefined> {
    const credentialsResult = requireCredentials()
    if (!credentialsResult.ok) {
      this.output.error(credentialsResult.error)
      return 1
    }
    const credentials = credentialsResult.credentials

    const { content } = await readCliInput({ allowStdinWhenNoPath: true })
    const rawInput = (content ?? '').trim()
    const result = generateSmartCdnUrl(rawInput, credentials)

    if (result.ok) {
      process.stdout.write(`${result.output}\n`)
      return undefined
    }

    this.output.error(result.error)
    return 1
  }
}

/**
 * Mint a short-lived bearer token via POST /token (HTTP Basic Auth).
 *
 * This is intentionally stdout-clean JSON so it can be used by agents and scripts.
 */
export class TokenCommand extends UnauthenticatedCommand {
  static override paths = [['auth', 'token']]

  static override usage = Command.Usage({
    category: 'Auth',
    description: 'Mint a short-lived bearer token',
    details: `
      Calls POST /token using HTTP Basic Auth (TRANSLOADIT_KEY + TRANSLOADIT_SECRET) and prints the
      JSON response to stdout.
    `,
    examples: [
      ['Mint an MCP token (default aud)', 'transloadit auth token'],
      ['Override audience', 'transloadit auth token --aud api2'],
    ],
  })

  aud = Option.String('--aud', {
    description: 'Token audience (default: mcp).',
  })

  protected override async run(): Promise<number | undefined> {
    const credentialsResult = requireCredentials()
    if (!credentialsResult.ok) {
      this.output.error(credentialsResult.error)
      return 1
    }

    const result = await requestTokenWithCredentials(credentialsResult.credentials, {
      endpoint: this.endpoint,
      aud: this.aud,
    })

    if (result.ok) {
      process.stdout.write(`${result.output}\n`)
      return 0
    }

    this.output.error(result.error)
    return 1
  }
}
