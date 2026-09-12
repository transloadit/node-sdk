import { randomUUID } from 'node:crypto'
import { lstat, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'

import { Command, Option } from 'clipanion'
import { parse } from 'dotenv'
import { z } from 'zod'

import { getConfiguredCredentialsFilePath, readCliInput } from '../helpers.ts'
import { ensureError, isErrnoException } from '../types.ts'
import { UnauthenticatedCommand } from './BaseCommand.ts'

const credentialSchema = z
  .string()
  .trim()
  .min(1)
  .max(4096)
  .regex(/^[^\r\n\0]+$/)
const credentialsSchema = z.object({
  TRANSLOADIT_KEY: credentialSchema,
  TRANSLOADIT_SECRET: credentialSchema,
})

function quoteCredential(value: string): string {
  // Credentials are opaque. Choose a dotenv quote that preserves punctuation and literal escapes.
  for (const quote of ["'", '"', '`']) {
    const quoted = `${quote}${value}${quote}`
    if (parse(`value=${quoted}`).value === value) return quoted
  }
  throw new Error(
    'This credential cannot be represented safely in a dotenv file; nothing was saved',
  )
}

async function promptCredentials(): Promise<unknown> {
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    throw new Error(
      'Use an interactive terminal, or auth login --stdin with TRANSLOADIT_KEY and TRANSLOADIT_SECRET in dotenv format',
    )
  }
  // A silent terminal output keeps both pasted credentials out of terminal transcripts and history.
  const output = new Writable({
    write(_chunk, _encoding, done) {
      done()
    },
  })
  const prompt = createInterface({ input: process.stdin, output, terminal: true })
  const abort = new AbortController()
  prompt.on('SIGINT', () => abort.abort())
  try {
    process.stderr.write('Assembly Auth Key (input hidden): ')
    const key = await prompt.question('', { signal: abort.signal })
    process.stderr.write('\nAssembly Auth Secret (input hidden): ')
    const secret = await prompt.question('', { signal: abort.signal })
    process.stderr.write('\n')
    return { TRANSLOADIT_KEY: key.trim(), TRANSLOADIT_SECRET: secret.trim() }
  } finally {
    prompt.close()
    output.destroy()
  }
}

/** Saves CLI-only credentials without passing secrets through command-line arguments. */
export class AuthLoginCommand extends UnauthenticatedCommand {
  static override paths = [['auth', 'login']]
  static override usage = Command.Usage({
    category: 'Authentication',
    description: 'Save Assembly credentials privately in ~/.transloadit/credentials',
    details:
      'Prompts with hidden input. Honors a shell TRANSLOADIT_CREDENTIALS_FILE override, never one from project .env, and refuses app env files. Existing credentials require --replace. This saves credentials locally, not a server-side credential check.',
  })

  stdin = Option.Boolean('--stdin', false, {
    description: 'Read TRANSLOADIT_KEY and TRANSLOADIT_SECRET in dotenv format from stdin',
  })
  replace = Option.Boolean('--replace', false, {
    description: 'Explicitly replace an existing regular credentials file',
  })

  protected async run(): Promise<number | undefined> {
    const file = getConfiguredCredentialsFilePath('shell')
    const temporary = `${file}.${randomUUID()}.tmp`
    let ownsTemporary = false
    try {
      if (/^\.env(?:\.|$)/i.test(basename(file)))
        throw new Error('Credentials destination must not be an app env file')
      const input = this.stdin
        ? parse((await readCliInput({ inputPath: '-' })).content ?? '')
        : await promptCredentials()
      const credentials = credentialsSchema.safeParse(input)
      if (!credentials.success)
        throw new Error(
          'Provide a valid TRANSLOADIT_KEY and TRANSLOADIT_SECRET pair; nothing was saved',
        )
      const data = `TRANSLOADIT_KEY=${quoteCredential(credentials.data.TRANSLOADIT_KEY)}\nTRANSLOADIT_SECRET=${quoteCredential(credentials.data.TRANSLOADIT_SECRET)}\n`
      await mkdir(dirname(file), { recursive: true, mode: 0o700 })
      if (this.replace) {
        const info = await lstat(file).catch((error: unknown) => {
          if (isErrnoException(error) && error.code === 'ENOENT') return undefined
          throw error
        })
        if (info !== undefined && !info.isFile())
          throw new Error(
            'Credentials must be a regular file; symlinks and directories are not replaced',
          )
        await writeFile(temporary, data, { flag: 'wx', mode: 0o600 })
        ownsTemporary = true
        await rename(temporary, file)
      } else {
        await writeFile(file, data, { flag: 'wx', mode: 0o600 })
      }
      this.output.print(
        `Saved CLI credentials to ${file}. Application env files were not changed.`,
        { saved: file },
      )
      return undefined
    } catch (error) {
      this.output.error(
        isErrnoException(error) && error.code === 'EEXIST'
          ? 'Credentials already exist; use --replace to replace them explicitly'
          : ensureError(error).message,
      )
      return 1
    } finally {
      if (ownsTemporary) await rm(temporary, { force: true })
    }
  }
}
