import { exec } from 'node:child_process'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { rimraf } from 'rimraf'
import { Transloadit as TransloaditClient } from '../../../src/Transloadit.ts'
import { hasLiveCredentials, loadRepoRootDotenv } from '../../test-env.ts'

export const execAsync = promisify(exec)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const cliPath = path.resolve(__dirname, '../../../src/cli.ts')

export const tmpDir = '/tmp'

loadRepoRootDotenv()
export const hasTransloaditCredentials = hasLiveCredentials()

export const authKey = process.env.TRANSLOADIT_KEY
export const authSecret = process.env.TRANSLOADIT_SECRET

process.setMaxListeners(Number.POSITIVE_INFINITY)

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface OutputEntry {
  type: string
  msg: unknown
  json?: { id?: string; assembly_id?: string } & Record<string, unknown>
}

export function testCase<T>(cb: (client: TransloaditClient) => Promise<T>): () => Promise<T> {
  const cwd = process.cwd()
  return async () => {
    if (!hasTransloaditCredentials || !authKey || !authSecret) {
      throw new Error(
        'Missing TRANSLOADIT_KEY/TRANSLOADIT_SECRET. These e2e tests require live credentials.',
      )
    }
    const dirname = path.join(
      tmpDir,
      `transloadit_test-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    )
    const client = new TransloaditClient({ authKey, authSecret })
    try {
      await fsp.mkdir(dirname)
      process.chdir(dirname)
      return await cb(client)
    } finally {
      process.chdir(cwd)
      await rimraf(dirname)
    }
  }
}

export function runCli(
  args: string,
  env: Record<string, string> = {},
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(`${process.execPath} ${cliPath} ${args}`, {
    env: { ...process.env, ...env },
  })
}

export function createClient(): TransloaditClient {
  if (!hasTransloaditCredentials || !authKey || !authSecret) {
    throw new Error(
      'Missing TRANSLOADIT_KEY/TRANSLOADIT_SECRET. These e2e tests require live credentials.',
    )
  }
  return new TransloaditClient({ authKey, authSecret })
}
