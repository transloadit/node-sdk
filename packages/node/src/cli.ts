#!/usr/bin/env node

import { realpathSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { loadProjectDotenvIntoProcessEnv } from './cli/helpers.ts'
import { ensureError } from './cli/types.ts'

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

export async function main(args = process.argv.slice(2)): Promise<void> {
  loadProjectDotenvIntoProcessEnv()
  const { createCli } = await import('./cli/commands/index.ts')
  const cli = createCli()
  const exitCode = await cli.run(args)
  if (exitCode !== 0) {
    process.exitCode = exitCode
  }
}

export async function runCliWhenExecuted(): Promise<void> {
  if (!shouldRunCli(process.argv[1])) return

  await main().catch((error) => {
    console.error(ensureError(error).message)
    process.exitCode = 1
  })
}

await runCliWhenExecuted()
