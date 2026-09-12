import { randomUUID } from 'node:crypto'
import { lstat, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'

import { Command, Option } from 'clipanion'
import { parse } from 'dotenv'
import { z } from 'zod'

import { Transloadit } from '../../Transloadit.ts'
import { getConfiguredCredentialsFilePath, readCliInput } from '../helpers.ts'
import { promptSecretInput, quoteCredential } from '../secretInput.ts'
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

/** Saves CLI-only credentials without passing secrets through command-line arguments. */
export class AuthLoginCommand extends UnauthenticatedCommand {
  static override paths = [['auth', 'login']]
  static override usage = Command.Usage({
    category: 'Authentication',
    description: 'Save Assembly credentials privately in ~/.transloadit/credentials',
    details:
      'Prompts with hidden input and verifies one signed Template read before saving. The key needs read scope. Honors a shell TRANSLOADIT_CREDENTIALS_FILE override, never one from project .env, and refuses app env files. Existing credentials require --replace. Verification uses production unless --endpoint is explicitly supplied.',
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
        : await promptSecretInput({
            TRANSLOADIT_KEY: 'Assembly Auth Key',
            TRANSLOADIT_SECRET: 'Assembly Auth Secret',
          })
      const credentials = credentialsSchema.safeParse(input)
      if (!credentials.success)
        throw new Error(
          'Provide a valid TRANSLOADIT_KEY and TRANSLOADIT_SECRET pair; nothing was saved',
        )
      // Never send newly pasted credentials to a project-controlled dotenv endpoint.
      const endpoint = new URL(this.endpoint ?? 'https://api2.transloadit.com')
      if (
        (endpoint.protocol !== 'https:' &&
          !(
            endpoint.protocol === 'http:' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
          )) ||
        endpoint.username ||
        endpoint.password ||
        endpoint.search ||
        endpoint.hash ||
        endpoint.pathname !== '/'
      )
        throw new Error(
          'Login endpoint must be an HTTPS API origin (HTTP is allowed only on loopback)',
        )
      const origin = endpoint.origin
      const client = new Transloadit({
        authKey: credentials.data.TRANSLOADIT_KEY,
        authSecret: credentials.data.TRANSLOADIT_SECRET,
        endpoint: origin,
        maxRetries: 0,
        timeout: 10_000,
      })
      await client.listTemplates({ pagesize: 1 }).catch((error: unknown) => {
        throw new Error(
          'Could not verify these credentials. Check the endpoint, key/secret and read scope at https://transloadit.com/c/template-credentials/. Nothing was saved.',
          { cause: error },
        )
      })
      const data = `TRANSLOADIT_KEY=${quoteCredential(credentials.data.TRANSLOADIT_KEY)}\nTRANSLOADIT_SECRET=${quoteCredential(credentials.data.TRANSLOADIT_SECRET)}\n${this.endpoint === undefined ? '' : `TRANSLOADIT_ENDPOINT=${quoteCredential(origin)}\n`}`
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
        `Verified one signed Template read and saved CLI credentials to ${file}. Application env files were not changed.`,
        { saved: file, verified: true },
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
