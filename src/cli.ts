#!/usr/bin/env node

import { realpathSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { createCli } from './cli/commands/index.ts'

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
  const cli = createCli()
  const exitCode = await cli.run(args)
  if (exitCode !== 0) {
    process.exitCode = exitCode
  }
}

export function runCliWhenExecuted(): void {
  if (!shouldRunCli(process.argv[1])) return

  void main().catch((error) => {
    console.error((error as Error).message)
    process.exitCode = 1
  })
}

runCliWhenExecuted()
