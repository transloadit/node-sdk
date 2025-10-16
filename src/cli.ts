#!/usr/bin/env node

import { realpathSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { type ZodIssue, z } from 'zod'
import {
  assemblyAuthInstructionsSchema,
  assemblyInstructionsSchema,
} from './alphalib/types/template.ts'
import type { OptionalAuthParams } from './apiTypes.ts'
import { Transloadit } from './Transloadit.ts'

type UrlParamPrimitive = string | number | boolean
type UrlParamArray = UrlParamPrimitive[]
type NormalizedUrlParams = Record<string, UrlParamPrimitive | UrlParamArray>

interface RunSigOptions {
  providedInput?: string
  algorithm?: string
}

interface RunSmartSigOptions {
  providedInput?: string
}

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

export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return ''

  process.stdin.setEncoding('utf8')
  let data = ''

  for await (const chunk of process.stdin) {
    data += chunk
  }

  return data
}

function fail(message: string): void {
  console.error(message)
  process.exitCode = 1
}

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

function ensureCredentials(): { authKey: string; authSecret: string } | null {
  const authKey = process.env.TRANSLOADIT_KEY || process.env.TRANSLOADIT_AUTH_KEY
  const authSecret = process.env.TRANSLOADIT_SECRET || process.env.TRANSLOADIT_AUTH_SECRET

  if (!authKey || !authSecret) {
    fail(
      'Missing credentials. Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET environment variables.',
    )
    return null
  }

  return { authKey, authSecret }
}

export async function runSig(options: RunSigOptions = {}): Promise<void> {
  const credentials = ensureCredentials()
  if (credentials == null) return
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
  if (credentials == null) return
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

function parseSigArguments(args: string[]): { algorithm?: string } {
  let algorithm: string | undefined
  let index = 0
  while (index < args.length) {
    const arg = args[index]
    if (arg === '--algorithm' || arg === '-a') {
      const next = args[index + 1]
      if (next == null || next.startsWith('-')) {
        throw new Error('Missing value for --algorithm option')
      }
      algorithm = next
      index += 2
      continue
    }
    if (arg.startsWith('--algorithm=')) {
      const [, value] = arg.split('=', 2)
      if (value === undefined || value === '') {
        throw new Error('Missing value for --algorithm option')
      }
      algorithm = value
      index += 1
      continue
    }
    throw new Error(`Unknown option: ${arg}`)
  }

  return { algorithm }
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const [command, ...commandArgs] = args

  switch (command) {
    case 'smart_sig': {
      await runSmartSig()
      break
    }

    case 'sig': {
      try {
        const { algorithm } = parseSigArguments(commandArgs)
        await runSig({ algorithm })
      } catch (error) {
        fail((error as Error).message)
      }
      break
    }

    case '-h':
    case '--help':
    case undefined: {
      process.stdout.write(
        [
          'Usage:',
          '  npx transloadit smart_sig    Read Smart CDN params JSON from stdin and output a signed URL.',
          '  npx transloadit sig [--algorithm <name>]    Read params JSON from stdin and output signed payload JSON.',
          '',
          'Required JSON fields:',
          '  smart_sig: workspace, template, input',
          '  sig: none (object is optional)',
          'Optional JSON fields:',
          '  smart_sig: expire_at_ms, url_params',
          '  sig: auth.expires and any supported assembly params',
          '',
          'Environment variables:',
          '  TRANSLOADIT_KEY, TRANSLOADIT_SECRET',
        ].join('\n'),
      )
      if (command === undefined) process.exitCode = 1
      break
    }

    default: {
      fail(`Unknown command: ${command}`)
    }
  }
}

const currentFile = realpathSync(fileURLToPath(import.meta.url))

function resolveInvokedPath(invoked?: string): string | null {
  if (invoked == null) return null
  try {
    return realpathSync(invoked)
  } catch {
    return path.resolve(invoked)
  }
}

export function shouldRunCli(invoked?: string): boolean {
  const resolved = resolveInvokedPath(invoked)
  if (resolved == null) return false
  return resolved === currentFile
}

export function runCliWhenExecuted(): void {
  if (!shouldRunCli(process.argv[1])) return

  void main().catch((error) => {
    fail((error as Error).message)
  })
}

runCliWhenExecuted()
