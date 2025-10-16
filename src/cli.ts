#!/usr/bin/env node

import { realpathSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { type ZodIssue, z } from 'zod'
import { Transloadit } from './Transloadit.ts'

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

export async function runSmartSig(providedInput?: string): Promise<void> {
  const authKey = process.env.TRANSLOADIT_KEY || process.env.TRANSLOADIT_AUTH_KEY
  const authSecret = process.env.TRANSLOADIT_SECRET || process.env.TRANSLOADIT_AUTH_SECRET

  if (!authKey || !authSecret) {
    fail(
      'Missing credentials. Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET environment variables.',
    )
    return
  }

  const rawInput = providedInput ?? (await readStdin())
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
  const signedUrl = client.getSignedSmartCDNUrl({
    workspace,
    template,
    input: inputField,
    urlParams,
    expiresAt,
  })
  process.stdout.write(`${signedUrl}\n`)
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const [command] = args

  switch (command) {
    case 'smart_sig': {
      await runSmartSig()
      break
    }

    case '-h':
    case '--help':
    case undefined: {
      process.stdout.write(
        [
          'Usage:',
          '  npx transloadit smart_sig    Read Smart CDN params JSON from stdin and output a signed URL.',
          '',
          'Required JSON fields:',
          '  workspace, template, input',
          'Optional JSON fields:',
          '  expire_at_ms, url_params',
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
