import type { CliKeySecretCredentials } from '../helpers.ts'

import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'

import { Command, Option } from 'clipanion'
import { parse } from 'dotenv'
import { z } from 'zod'

import { Transloadit } from '../../Transloadit.ts'
import { deviceLogin } from '../deviceLogin.ts'
import {
  cliSignatureAlgorithmSchema,
  getConfiguredCredentialsFilePath,
  readCliInput,
  resolveCliConfig,
} from '../helpers.ts'
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
  TRANSLOADIT_SIGNATURE_ALGORITHM: cliSignatureAlgorithmSchema.optional(),
  TRANSLOADIT_KEY: credentialSchema,
  TRANSLOADIT_SECRET: credentialSchema,
  TRANSLOADIT_WORKSPACE: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)
    .optional(),
})

async function existingLoginMessage(file: string): Promise<string> {
  const metadata = await lstat(file)
    .then(async (info) => {
      if (!info.isFile()) return 'Saved login metadata unavailable (not a regular file).'
      const fields = parse(await readFile(file, 'utf8'))
      // Only identity fields are displayed; JSON quoting keeps saved terminal controls inert.
      return [
        `Workspace: ${fields.TRANSLOADIT_WORKSPACE ? JSON.stringify(fields.TRANSLOADIT_WORKSPACE) : 'not recorded'}`,
        `Description: ${fields.TRANSLOADIT_AUTH_KEY_DESCRIPTION ? JSON.stringify(fields.TRANSLOADIT_AUTH_KEY_DESCRIPTION) : 'not recorded'}`,
        `File modified: ${info.mtime.toISOString()}`,
      ].join('\n')
    })
    .catch(() => 'Saved login metadata unavailable (could not read the file).')
  return [
    `Credentials already exist at ${JSON.stringify(file)}. The saved file was preserved.`,
    metadata,
    'For a separate login, set TRANSLOADIT_CREDENTIALS_FILE to another file path and run transloadit auth login again.',
    'Use --replace only if you intend to overwrite this saved login.',
  ].join('\n')
}

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
      'Read TRANSLOADIT_KEY, TRANSLOADIT_SECRET and optional TRANSLOADIT_WORKSPACE in dotenv format; combined Smart CDN keys also need TRANSLOADIT_SIGNATURE_ALGORITHM=sha256',
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
    let loginWorkspace: string | undefined
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
        if (!this.replace) throw new Error(await existingLoginMessage(file))
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
      let credentials: CliKeySecretCredentials & {
        workspace?: string
        authKeyId?: string
        description?: string
      }
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
          ...(input.data.TRANSLOADIT_SIGNATURE_ALGORITHM === undefined
            ? {}
            : { signatureAlgorithm: input.data.TRANSLOADIT_SIGNATURE_ALGORITHM }),
        }
        const client = new Transloadit({
          ...credentials,
          endpoint: origin,
          maxRetries: 0,
          timeout: 10_000,
        })
        await client.listTemplates({ pagesize: 1 }).catch((error: unknown) => {
          throw new Error(
            `Could not verify these credentials. Check the endpoint, key/secret and read scope at https://transloadit.com/c/${credentials.workspace ?? '<workspace>'}/template-credentials/. Combined Smart CDN keys need TRANSLOADIT_SIGNATURE_ALGORITHM=sha256 in the stdin input. Nothing was saved.`,
            { cause: error },
          )
        })
      } else credentials = await deviceLogin(origin, this.output, this.noBrowser)
      loginWorkspace = credentials.workspace
      const fields = {
        TRANSLOADIT_KEY: credentials.authKey,
        TRANSLOADIT_SECRET: credentials.authSecret,
        TRANSLOADIT_WORKSPACE: credentials.workspace,
        TRANSLOADIT_WORKSPACE_VERIFIED: this.stdin ? undefined : 'true',
        TRANSLOADIT_LOGIN_METHOD: this.stdin ? 'stdin' : 'device',
        TRANSLOADIT_SIGNATURE_ALGORITHM: credentials.signatureAlgorithm,
        TRANSLOADIT_ENDPOINT: this.endpoint === undefined ? undefined : origin,
        TRANSLOADIT_AUTH_KEY_ID: credentials.authKeyId,
        TRANSLOADIT_AUTH_KEY_DESCRIPTION: credentials.description,
      }
      const data = `${Object.entries(fields)
        .flatMap(([name, value]) =>
          value === undefined ? [] : [`${name}=${quoteCredential(value)}`],
        )
        .join('\n')}\n`
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
      // A signed read checks dam:write access and catalog readiness without publishing anything.
      // It does not prove that the worker's object store can accept a later upload.
      const storagePolicyAccess = await new Transloadit({
        ...credentials,
        endpoint: origin,
        maxRetries: 0,
        timeout: 10_000,
      })
        .listPublicStoragePrefixes()
        .then(
          () => true,
          () => false,
        )
      if (!storagePolicyAccess) {
        const workspace =
          credentials.workspace !== undefined &&
          /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(credentials.workspace)
            ? credentials.workspace
            : '<workspace>'
        this.output.warn(
          `Login saved, but Storage policy access could not be verified. Before uploading, check Storage availability and the Auth Key dam:write scope at https://transloadit.com/c/${workspace}/template-credentials/. A temporary network failure can also prevent this check; retry with transloadit storage publications.`,
        )
      }
      const message =
        credentials.workspace === undefined
          ? `Verified one signed Template read and saved CLI credentials to ${file}. Application env files were not changed.`
          : `Logged in to workspace ${credentials.workspace}`
      this.output.print(
        `${message}${storagePolicyAccess ? '\nStorage policy access verified.' : ''}`,
        {
          saved: file,
          storagePolicyAccess,
          verified: true,
          ...(credentials.workspace === undefined ? {} : { workspace: credentials.workspace }),
        },
      )
      return undefined
    } catch (error) {
      this.output.error(
        isErrnoException(error) && error.code === 'EEXIST'
          ? [
              await existingLoginMessage(file),
              `This login’s ${this.stdin ? 'verified' : 'approved'} Auth Key was not saved.`,
              this.stdin
                ? 'No new Auth Key was created. The supplied key may still be used by other applications.'
                : `Review it in Console → Credentials: https://transloadit.com/c/${loginWorkspace ?? '<workspace>'}/template-credentials/; revoke it there if no longer needed.`,
              'Be careful: auth logout would use the saved login, not this unsaved one.',
            ].join('\n')
          : ensureError(error).message,
      )
      return 1
    } finally {
      if (ownsTemporary) await rm(temporary, { force: true })
    }
  }
}

/** Shows the saved CLI login, never a signing key or secret. */
export class AuthStatusCommand extends UnauthenticatedCommand {
  static override paths = [['auth', 'status']]
  static override usage = Command.Usage({
    category: 'Authentication',
    description: 'Show the saved CLI workspace and key description',
  })
  protected run(): Promise<number | undefined> {
    const config = resolveCliConfig('login')
    if (config.credentials === undefined) {
      this.output.error(config.loadError ?? 'Not logged in. Run transloadit auth login.')
      return Promise.resolve(1)
    }
    const workspace = config.credentialsWorkspace ?? 'not recorded'
    const description =
      config.credentialsDescription ?? 'Existing Auth Key (description not recorded)'
    this.output.print(
      `Saved login: ${workspace}\n${description}\nStorage commands report any shell or project credential override before use.`,
      { workspace, description },
    )
    return Promise.resolve(undefined)
  }
}

/** Revokes browser-login keys; imported application keys need explicit revocation consent. */
export class AuthLogoutCommand extends UnauthenticatedCommand {
  static override paths = [['auth', 'logout']]
  static override usage = Command.Usage({
    category: 'Authentication',
    description: 'Remove saved credentials; browser-login keys are also revoked',
  })
  revoke = Option.Boolean('--revoke', {
    description: 'Also revoke an imported Auth Key; other applications using it will stop working',
  })
  protected async run(): Promise<number | undefined> {
    try {
      if (this.revoke === false)
        throw new Error(
          '--no-revoke is not supported. Nothing was changed; browser-login logout revokes its key.',
        )
      const file = getConfiguredCredentialsFilePath('shell')
      if (/^\.env(?:\.|$)/i.test(basename(file)))
        throw new Error('Logout never removes application env files')
      const info = await lstat(file)
      if (!info.isFile())
        throw new Error('Logout requires a regular credentials file, not a symlink or directory')
      const before = await readFile(file, 'utf8')
      // Imported and legacy keys may be shared with applications; never infer disposability.
      const revoke = this.revoke === true || parse(before).TRANSLOADIT_LOGIN_METHOD === 'device'
      if (revoke) {
        const config = resolveCliConfig('login')
        if (config.credentials === undefined) throw new Error(config.loadError ?? 'Not logged in')
        const endpoint = config.credentialsEndpoint ?? 'https://api2.transloadit.com'
        if (
          this.endpoint !== undefined &&
          new URL(this.endpoint).origin !== new URL(endpoint).origin
        )
          throw new Error('Logout must use the saved login endpoint; no credentials were sent')
        await new Transloadit({ ...config.credentials, endpoint, maxRetries: 0, timeout: 10_000 })
          .revokeOwnAuthKey()
          .catch((cause: unknown) => {
            throw new Error(
              'The CLI key was not revoked. Check connectivity and Console key permissions, then retry; the credentials file was kept.',
              { cause },
            )
          })
      }
      if (!(await lstat(file)).isFile() || (await readFile(file, 'utf8')) !== before)
        throw new Error(
          `${revoke ? 'The key was revoked, but the' : 'The'} credentials file changed during logout and was preserved`,
        )
      await rm(file)
      this.output.print(
        revoke
          ? 'CLI key revoked and saved credentials removed.'
          : 'Saved credentials removed. Remote credentials were not revoked.',
        {
          revoked: revoke,
          removed: true,
        },
      )
      return undefined
    } catch (error) {
      this.output.error(
        isErrnoException(error) && error.code === 'ENOENT'
          ? 'Not logged in; no saved credentials file.'
          : ensureError(error).message,
      )
      return 1
    }
  }
}
