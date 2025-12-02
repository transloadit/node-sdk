import process from 'node:process'
import { Command, Option } from 'clipanion'
import { type ZodIssue, z } from 'zod'
import {
  assemblyAuthInstructionsSchema,
  assemblyInstructionsSchema,
} from '../../alphalib/types/template.ts'
import type { OptionalAuthParams } from '../../apiTypes.ts'
import { Transloadit } from '../../Transloadit.ts'
import { UnauthenticatedCommand } from './BaseCommand.ts'

type UrlParamPrimitive = string | number | boolean
type UrlParamArray = UrlParamPrimitive[]
type NormalizedUrlParams = Record<string, UrlParamPrimitive | UrlParamArray>

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

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return ''

  process.stdin.setEncoding('utf8')
  let data = ''

  for await (const chunk of process.stdin) {
    data += chunk
  }

  return data
}

function ensureCredentials(): { authKey: string; authSecret: string } | null {
  const authKey = process.env.TRANSLOADIT_KEY || process.env.TRANSLOADIT_AUTH_KEY
  const authSecret = process.env.TRANSLOADIT_SECRET || process.env.TRANSLOADIT_AUTH_SECRET

  if (!authKey || !authSecret) {
    return null
  }

  return { authKey, authSecret }
}

// Testable helper functions exported for unit tests
export interface RunSigOptions {
  providedInput?: string
  algorithm?: string
}

export interface RunSmartSigOptions {
  providedInput?: string
}

function fail(message: string): void {
  console.error(message)
  process.exitCode = 1
}

export async function runSig(options: RunSigOptions = {}): Promise<void> {
  const credentials = ensureCredentials()
  if (credentials == null) {
    fail(
      'Missing credentials. Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET environment variables.',
    )
    return
  }
  const { authKey, authSecret } = credentials
  const { providedInput, algorithm } = options

  const rawInput = providedInput ?? (await readStdin())
  const input = rawInput.trim()
  let params: Record<string, unknown>

  if (input === '') {
    params = { auth: { key: authKey } }
  } else {
    let parsed: unknown
    try {
      parsed = JSON.parse(input)
    } catch (error) {
      fail(`Failed to parse JSON from stdin: ${(error as Error).message}`)
      return
    }

    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      fail('Invalid params provided via stdin. Expected a JSON object.')
      return
    }

    const parsedResult = cliSignatureParamsSchema.safeParse(parsed)
    if (!parsedResult.success) {
      fail(`Invalid params: ${formatIssues(parsedResult.error.issues)}`)
      return
    }

    const parsedParams = parsedResult.data as Record<string, unknown>
    const existingAuth =
      typeof parsedParams.auth === 'object' &&
      parsedParams.auth != null &&
      !Array.isArray(parsedParams.auth)
        ? (parsedParams.auth as Record<string, unknown>)
        : {}

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
    process.stdout.write(`${JSON.stringify(signature)}\n`)
  } catch (error) {
    fail(`Failed to generate signature: ${(error as Error).message}`)
  }
}

export async function runSmartSig(options: RunSmartSigOptions = {}): Promise<void> {
  const credentials = ensureCredentials()
  if (credentials == null) {
    fail(
      'Missing credentials. Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET environment variables.',
    )
    return
  }
  const { authKey, authSecret } = credentials

  const rawInput = options.providedInput ?? (await readStdin())
  const input = rawInput.trim()
  if (input === '') {
    fail(
      'Missing params provided via stdin. Expected a JSON object with workspace, template, input, and optional Smart CDN parameters.',
    )
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (error) {
    fail(`Failed to parse JSON from stdin: ${(error as Error).message}`)
    return
  }

  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail('Invalid params provided via stdin. Expected a JSON object.')
    return
  }

  const parsedResult = smartCdnParamsSchema.safeParse(parsed)
  if (!parsedResult.success) {
    fail(`Invalid params: ${formatIssues(parsedResult.error.issues)}`)
    return
  }

  const { workspace, template, input: inputFieldRaw, url_params, expire_at_ms } = parsedResult.data
  const urlParams = normalizeUrlParams(url_params as Record<string, unknown> | undefined)

  let expiresAt: number | undefined
  if (typeof expire_at_ms === 'string') {
    const parsedNumber = Number.parseInt(expire_at_ms, 10)
    if (Number.isNaN(parsedNumber)) {
      fail('Invalid params: expire_at_ms must be a number.')
      return
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
    process.stdout.write(`${signedUrl}\n`)
  } catch (error) {
    fail(`Failed to generate Smart CDN URL: ${(error as Error).message}`)
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
    const credentials = ensureCredentials()
    if (credentials == null) {
      this.output.error(
        'Missing credentials. Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET environment variables.',
      )
      return 1
    }
    const { authKey, authSecret } = credentials

    const rawInput = await readStdin()
    const input = rawInput.trim()
    let params: Record<string, unknown>

    if (input === '') {
      params = { auth: { key: authKey } }
    } else {
      let parsed: unknown
      try {
        parsed = JSON.parse(input)
      } catch (error) {
        this.output.error(`Failed to parse JSON from stdin: ${(error as Error).message}`)
        return 1
      }

      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this.output.error('Invalid params provided via stdin. Expected a JSON object.')
        return 1
      }

      const parsedResult = cliSignatureParamsSchema.safeParse(parsed)
      if (!parsedResult.success) {
        this.output.error(`Invalid params: ${formatIssues(parsedResult.error.issues)}`)
        return 1
      }

      const parsedParams = parsedResult.data as Record<string, unknown>
      const existingAuth =
        typeof parsedParams.auth === 'object' &&
        parsedParams.auth != null &&
        !Array.isArray(parsedParams.auth)
          ? (parsedParams.auth as Record<string, unknown>)
          : {}

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
      const signature = client.calcSignature(params as OptionalAuthParams, this.algorithm)
      process.stdout.write(`${JSON.stringify(signature)}\n`)
    } catch (error) {
      this.output.error(`Failed to generate signature: ${(error as Error).message}`)
      return 1
    }

    return undefined
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
    const credentials = ensureCredentials()
    if (credentials == null) {
      this.output.error(
        'Missing credentials. Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET environment variables.',
      )
      return 1
    }
    const { authKey, authSecret } = credentials

    const rawInput = await readStdin()
    const input = rawInput.trim()
    if (input === '') {
      this.output.error(
        'Missing params provided via stdin. Expected a JSON object with workspace, template, input, and optional Smart CDN parameters.',
      )
      return 1
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(input)
    } catch (error) {
      this.output.error(`Failed to parse JSON from stdin: ${(error as Error).message}`)
      return 1
    }

    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      this.output.error('Invalid params provided via stdin. Expected a JSON object.')
      return 1
    }

    const parsedResult = smartCdnParamsSchema.safeParse(parsed)
    if (!parsedResult.success) {
      this.output.error(`Invalid params: ${formatIssues(parsedResult.error.issues)}`)
      return 1
    }

    const {
      workspace,
      template,
      input: inputFieldRaw,
      url_params,
      expire_at_ms,
    } = parsedResult.data
    const urlParams = normalizeUrlParams(url_params as Record<string, unknown> | undefined)

    let expiresAt: number | undefined
    if (typeof expire_at_ms === 'string') {
      const parsedNumber = Number.parseInt(expire_at_ms, 10)
      if (Number.isNaN(parsedNumber)) {
        this.output.error('Invalid params: expire_at_ms must be a number.')
        return 1
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
      process.stdout.write(`${signedUrl}\n`)
    } catch (error) {
      this.output.error(`Failed to generate Smart CDN URL: ${(error as Error).message}`)
      return 1
    }

    return undefined
  }
}
