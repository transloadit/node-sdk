import { randomUUID } from 'node:crypto'
import { lstat, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'

import { Command, Option } from 'clipanion'
import { parse } from 'dotenv'
import { z } from 'zod'

import { Transloadit } from '../../Transloadit.ts'
import { deviceLogin } from '../deviceLogin.ts'
import { getConfiguredCredentialsFilePath, readCliInput } from '../helpers.ts'
import { quoteCredential } from '../secretInput.ts'
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
  TRANSLOADIT_WORKSPACE: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)
    .optional(),
})

/** Saves CLI-only credentials without passing secrets through command-line arguments. */
export class AuthLoginCommand extends UnauthenticatedCommand {
  static override paths = [['auth', 'login']]
  static override usage = Command.Usage({
    category: 'Authentication',
    description: 'Log in through the browser and save your workspace Auth Key privately',
    details:
      'Opens a one-time browser approval; --no-browser prints the URL without opening it. --stdin accepts existing credentials and verifies a signed Template read. Honors a shell TRANSLOADIT_CREDENTIALS_FILE override, never one from project .env, and refuses app env files. Existing credentials require --replace. Uses production unless --endpoint is explicitly supplied.',
  })

  stdin = Option.Boolean('--stdin', false, {
    description:
      'Read TRANSLOADIT_KEY, TRANSLOADIT_SECRET and optional TRANSLOADIT_WORKSPACE in dotenv format',
  })
  noBrowser = Option.Boolean('--no-browser', false, {
    description: 'Print the device approval URL without launching a browser',
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
      const info = await lstat(file).catch((error: unknown) => {
        if (isErrnoException(error) && error.code === 'ENOENT') return undefined
        throw error
      })
      if (info !== undefined) {
        if (!info.isFile())
          throw new Error(
            'Credentials must be a regular file; symlinks and directories are not replaced',
          )
        if (!this.replace)
          throw new Error('Credentials already exist; use --replace to replace them explicitly')
      }
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
      let credentials: { authKey: string; authSecret: string; workspace?: string }
      if (this.stdin) {
        const input = credentialsSchema.safeParse(
          parse((await readCliInput({ inputPath: '-' })).content ?? ''),
        )
        if (!input.success)
          throw new Error(
            'Provide a valid TRANSLOADIT_KEY and TRANSLOADIT_SECRET pair; nothing was saved',
          )
        credentials = {
          authKey: input.data.TRANSLOADIT_KEY,
          authSecret: input.data.TRANSLOADIT_SECRET,
          workspace: input.data.TRANSLOADIT_WORKSPACE,
        }
        const client = new Transloadit({
          authKey: credentials.authKey,
          authSecret: credentials.authSecret,
          endpoint: origin,
          maxRetries: 0,
          timeout: 10_000,
        })
        await client.listTemplates({ pagesize: 1 }).catch((error: unknown) => {
          throw new Error(
            `Could not verify these credentials. Check the endpoint, key/secret and read scope at https://transloadit.com/c/${credentials.workspace ?? '<workspace>'}/template-credentials/. Nothing was saved.`,
            { cause: error },
          )
        })
      } else credentials = await deviceLogin(origin, this.output, this.noBrowser)
      const data = `TRANSLOADIT_KEY=${quoteCredential(credentials.authKey)}\nTRANSLOADIT_SECRET=${quoteCredential(credentials.authSecret)}\n${credentials.workspace === undefined ? '' : `TRANSLOADIT_WORKSPACE=${quoteCredential(credentials.workspace)}\n`}${this.endpoint === undefined ? '' : `TRANSLOADIT_ENDPOINT=${quoteCredential(origin)}\n`}`
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
        credentials.workspace === undefined
          ? `Verified one signed Template read and saved CLI credentials to ${file}. Application env files were not changed.`
          : `Logged in to workspace ${credentials.workspace}`,
        {
          saved: file,
          verified: true,
          ...(credentials.workspace === undefined ? {} : { workspace: credentials.workspace }),
        },
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
