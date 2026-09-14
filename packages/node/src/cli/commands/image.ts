import { lstat, mkdir, open, rm } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'

import { validateStoragePathPrefix } from '@transloadit/utils'
import { Command, Option } from 'clipanion'
import { z } from 'zod'

import { noticeCliCredentialSource, resolveCliConfig } from '../helpers.ts'
import { storagePublicError } from '../storagePublic.ts'
import {
  defaultStorageCatalog,
  readStorageCatalog,
  updateStorageReceipts,
} from '../storageReceipts.ts'
import { resolveStorageWorkspace } from '../storageS3.ts'
import {
  nextAppRoot,
  storageImageEnvBlock,
  storageImageFactory,
  storageImagePage,
} from '../storageSnippets.ts'
import { ensureError, isErrnoException } from '../types.ts'
import { UnauthenticatedCommand } from './BaseCommand.ts'

/** Scaffolds the Node-runtime Next.js integration without overwriting code or env files. */
export class ImageInitCommand extends UnauthenticatedCommand {
  static override paths = [['image', 'init']]
  static override usage = Command.Usage({
    category: 'Storage',
    description: 'Create a Next.js StorageImage factory and print rendering environment names',
    examples: [['Set up website images', 'transloadit image init website/ --public']],
  })

  privateDelivery = Option.Boolean('--private', false, {
    description: 'Also generate a redirect route; denies access until you supply authorization',
  })
  publicDelivery = Option.Boolean('--public', false, {
    description: 'Publish this directory on the server and use permanent unsigned image URLs',
  })
  receipts = Option.String('--receipts', defaultStorageCatalog, {
    description: 'Rendering catalog imported by the factory',
  })
  writeEnv = Option.Boolean('--write-env', false, {
    description: 'Reuse the saved login in an owner-only .env.local; never overwrite it',
  })
  prefix = Option.String({ required: true })
  workspace = Option.String('--workspace', {
    description: 'Workspace expected for the selected credentials',
  })

  protected async run(): Promise<number | undefined> {
    const created: string[] = []
    let published: string | undefined
    try {
      if (this.privateDelivery && this.publicDelivery)
        throw new Error('Choose either --private or --public, not both')
      if (!this.privateDelivery && !this.publicDelivery)
        throw new Error('Choose either --public or --private')
      const prefix =
        this.prefix.endsWith('/') || this.prefix === '' ? this.prefix : `${this.prefix}/`
      try {
        validateStoragePathPrefix(prefix, 0, 'prefix')
        if (prefix === '') throw new Error('Image scaffolds must name a directory')
      } catch (error) {
        throw new Error(
          'Provide one safe relative directory prefix ending in /, for example website/',
          { cause: error },
        )
      }
      const root = nextAppRoot()
      if (root === undefined)
        throw new Error('Run image init in a Next.js project containing app/ or src/app/')
      let environment: string | undefined
      const saved = resolveCliConfig('login')
      if (saved.loadError !== undefined) throw new Error(saved.loadError)
      const login = saved.auth === undefined ? resolveCliConfig() : saved
      if (!this.setupClient(login)) return 1
      noticeCliCredentialSource(login, this.output)
      const selectedEndpoint = this.endpoint ?? login.endpoint
      const deliveryEndpoint =
        selectedEndpoint === undefined ||
        new URL(selectedEndpoint).origin === 'https://api2.transloadit.com'
          ? undefined
          : selectedEndpoint
      if (this.writeEnv && this.privateDelivery) {
        const value = z
          .string()
          .min(1)
          .max(4096)
          .regex(/^[^\s][^\r\n\0]*$/)
          .refine((text) => text.trim() === text)
        const renderingValues = z.object({ TRANSLOADIT_KEY: value, TRANSLOADIT_SECRET: value })
        const parsed = renderingValues.safeParse({
          TRANSLOADIT_KEY: saved.credentials?.authKey,
          TRANSLOADIT_SECRET: saved.credentials?.authSecret,
        })
        if (!parsed.success)
          throw new Error(
            'Run transloadit auth login first to save your workspace and Auth Key. Nothing was written.',
          )
        // Next expands $ even in quoted dotenv values. Reject delimiters instead of silently
        // changing an opaque secret; JSON quoting alone is not dotenv/Next escaping.
        environment = Object.entries(parsed.data)
          .map(([name, text]) => {
            if (/["\\]/.test(text))
              throw new Error(
                'Rendering values cannot contain double quotes or backslashes; configure these values through the application environment instead',
              )
            return `${name}="${text.replaceAll('$', '\\$')}"\n`
          })
          .join('')
      }
      const catalog = await readStorageCatalog(this.receipts)
      const pageDirectory = `${root}app/storage-image-example`
      const files = [
        {
          path: `${root}lib/storageImage.ts`,
          content: storageImageFactory({
            prefix,
            privateDelivery: this.privateDelivery,
            endpoint: deliveryEndpoint,
            receiptsImport: relative(resolve(`${root}lib`), resolve(this.receipts)).replaceAll(
              '\\',
              '/',
            ),
          }),
        },
        {
          path: `${pageDirectory}/page.tsx`,
          content: storageImagePage(
            relative(resolve(pageDirectory), resolve(this.receipts)).replaceAll('\\', '/'),
            prefix,
          ),
        },
        ...(this.privateDelivery
          ? [
              {
                path: `${root}app/api/storage-images/route.ts`,
                content:
                  "export { storageRoute as GET, storageRoute as HEAD } from '../../../lib/storageImage'\n",
              },
            ]
          : []),
        ...(environment === undefined ? [] : [{ path: '.env.local', content: environment }]),
      ]
      // Discover conflicts before changing server policy; exclusive creates still protect races.
      for (const file of files) {
        const existing = await lstat(file.path).catch((error: unknown) => {
          if (isErrnoException(error) && error.code === 'ENOENT') return undefined
          throw error
        })
        if (existing !== undefined) throw new Error(`Refusing to overwrite ${file.path}`)
      }
      await updateStorageReceipts(this.receipts, async (previous, signal) => {
        const workspace = await resolveStorageWorkspace(this, login, previous?.workspace, signal)
        if (previous !== undefined && previous.workspace !== workspace)
          throw new Error(
            'Use --receipts with a separate catalog when initializing another workspace. Nothing was written.',
          )
        if (this.publicDelivery) {
          this.output.notice(
            `Publishing ${prefix} recursively: all current and future objects under this prefix will be public.`,
          )
          const result = await this.client
            .publishStoragePrefix(prefix, { signal })
            .catch((cause: unknown) => {
              signal.throwIfAborted()
              throw new Error(storagePublicError(cause, workspace), { cause })
            })
          published = result.prefix
        }
        return {
          workspace,
          public: [
            ...new Set([
              ...(previous?.public ?? []),
              ...(published === undefined ? [] : [published]),
            ]),
          ],
          images: previous?.images ?? {},
        }
      })
      if (catalog === undefined) created.push(this.receipts)
      for (const file of files) {
        await mkdir(dirname(file.path), { recursive: true })
        const handle = await open(file.path, 'wx', file.path === '.env.local' ? 0o600 : 0o666)
        created.push(file.path)
        try {
          await handle.writeFile(file.content)
        } finally {
          await handle.close()
        }
      }
      const instruction = this.privateDelivery
        ? 'Connect your application session and per-object authorization in storageImage.ts; the generated handler denies access until then.'
        : 'The directory is published. Public images use permanent unsigned CDN URLs.'
      if (deliveryEndpoint !== undefined)
        this.output.print(
          `Delivery uses the non-production API ${new URL(deliveryEndpoint).origin}; remove baseUrl/urlParams from storageImage.ts for Smart CDN delivery.`,
          { deliveryEndpoint: new URL(deliveryEndpoint).origin },
        )
      const envBlock = storageImageEnvBlock(this.publicDelivery)
      this.output.print(
        `Created ${created.join(', ')}\n${instruction}\nAdd an image under ${prefix} with storage store and open /storage-image-example. Commit ${this.receipts}.\n${this.publicDelivery ? 'Public rendering needs no environment variables, locally or on your host.' : this.writeEnv ? 'Rendering values were saved privately; never commit .env.local.' : `Add your rendering values to .env.local:\n${envBlock}`}`,
        { files: created, environment: envBlock },
      )
      return undefined
    } catch (error) {
      for (const path of created) {
        await rm(path).catch(() => {
          this.output.error(`Could not remove partial scaffold file ${path}; remove it manually.`)
        })
      }
      this.output.error(
        `${ensureError(error).message}${published === undefined ? '' : ` The server prefix ${published} remains public; use storage unpublish deliberately if needed.`}`,
      )
      return 1
    }
  }
}
