#!/usr/bin/env node

import { realpathSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import type { ZodIssue } from 'zod'
import {
  assemblyAuthInstructionsSchema,
  assemblyInstructionsSchema,
} from './alphalib/types/template.ts'
import type { OptionalAuthParams } from './apiTypes.ts'
import { Transloadit } from './Transloadit.ts'

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

const cliParamsSchema = assemblyInstructionsSchema
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
  let params: Record<string, unknown> = {}

  if (input !== '') {
    try {
      const parsed = JSON.parse(input)
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        fail('Invalid params provided via stdin. Expected a JSON object.')
        return
      }

      const parsedResult = cliParamsSchema.safeParse(parsed)
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
    } catch (error: unknown) {
      fail(`Failed to parse JSON from stdin: ${(error as Error).message}`)
      return
    }
  }

  const client = new Transloadit({ authKey, authSecret })
  const signature = client.calcSignature(params as OptionalAuthParams)
  process.stdout.write(`${JSON.stringify(signature)}\n`)
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
          '  npx transloadit smart_sig    Read params JSON from stdin and output signed payload.',
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
