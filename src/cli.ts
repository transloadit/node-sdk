#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Transloadit } from './Transloadit.ts'
import type { OptionalAuthParams } from './apiTypes.ts'

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
  let params: OptionalAuthParams = {}

  if (input !== '') {
    try {
      const parsed = JSON.parse(input)
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        fail('Invalid params provided via stdin. Expected a JSON object.')
        return
      }

      params = parsed as OptionalAuthParams
    } catch (error: unknown) {
      fail(`Failed to parse JSON from stdin: ${(error as Error).message}`)
      return
    }
  }

  const client = new Transloadit({ authKey, authSecret })
  const signature = client.calcSignature(params)
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

const currentFile = path.resolve(fileURLToPath(import.meta.url))
const invokedFile = typeof process.argv[1] === 'string' ? path.resolve(process.argv[1]) : ''

if (currentFile === invokedFile) {
  void main().catch((error) => {
    fail((error as Error).message)
  })
}
