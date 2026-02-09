import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * In this monorepo, `vitest` is often executed with a workspace CWD
 * (e.g. `packages/node`) so plain `dotenv/config` won't find the repo root `.env`.
 *
 * This helper loads the repo root `.env` if present, without overriding existing
 * env vars (CI provides secrets via the environment already).
 */
export function loadRepoRootDotenv(): void {
  const repoRootDotenv = path.resolve(__dirname, '../../..', '.env')
  if (!existsSync(repoRootDotenv)) return
  dotenvConfig({ path: repoRootDotenv, override: false })
}

export function hasLiveCredentials(): boolean {
  return Boolean(process.env.TRANSLOADIT_KEY && process.env.TRANSLOADIT_SECRET)
}
