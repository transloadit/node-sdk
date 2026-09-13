import { lstat, mkdir, open, rm } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'

import { validateStoragePathPrefix } from '@transloadit/utils'
import { Command, Option } from 'clipanion'
import { z } from 'zod'

import { describeCliCredentialSource, resolveCliConfig } from '../helpers.ts'
import { storagePublicError } from '../storagePublic.ts'
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
  receipts = Option.String('--receipts', 'images.json', {
    description: 'Rendering catalog imported by the factory',
  })
  writeEnv = Option.Boolean('--write-env', false, {
    description: 'Reuse the saved login in an owner-only .env.local; never overwrite it',
  })
  prefix = Option.String({ required: true })

  protected async run(): Promise<number | undefined> {
    const created: string[] = []
    let published: string | undefined
    try {
      if (this.privateDelivery && this.publicDelivery)
        throw new Error('Choose either --private or --public, not both')
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
      const login = this.writeEnv ? resolveCliConfig('login') : undefined
      if (login?.loadError !== undefined) throw new Error(login.loadError)
      if (this.writeEnv) {
        const value = z
          .string()
          .min(1)
          .max(4096)
          .regex(/^[^\s][^\r\n\0]*$/)
          .refine((text) => text.trim() === text)
        const workspace = z.object({ TRANSLOADIT_WORKSPACE: value })
        const renderingValues = this.publicDelivery
          ? workspace
          : workspace.extend({ TRANSLOADIT_KEY: value, TRANSLOADIT_SECRET: value })
        const parsed = renderingValues.safeParse({
          TRANSLOADIT_WORKSPACE: login?.credentialsWorkspace,
          TRANSLOADIT_KEY: login?.credentials?.authKey,
          TRANSLOADIT_SECRET: login?.credentials?.authSecret,
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
      const catalogExists = await lstat(this.receipts).catch((error: unknown) => {
        if (isErrnoException(error) && error.code === 'ENOENT') return undefined
        throw error
      })
      if (catalogExists !== undefined && !catalogExists.isFile())
        throw new Error('The rendering catalog must be a regular file')
      const pageDirectory = `${root}app/storage-image-example`
      const files = [
        {
          path: `${root}lib/storageImage.ts`,
          content: storageImageFactory({
            prefix,
            privateDelivery: this.privateDelivery,
            publicDelivery: this.publicDelivery,
            receiptsImport: relative(resolve(`${root}lib`), resolve(this.receipts)).replaceAll(
              '\\',
              '/',
            ),
          }),
        },
        ...(catalogExists === undefined ? [{ path: this.receipts, content: '{}\n' }] : []),
        {
          path: `${pageDirectory}/page.tsx`,
          content: storageImagePage(
            relative(resolve(pageDirectory), resolve(this.receipts)).replaceAll('\\', '/'),
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
      if (this.publicDelivery) {
        if (!this.setupClient(login)) return 1
        this.output.notice(describeCliCredentialSource(this.cliConfig))
        const result = await this.client.publishStoragePrefix(prefix).catch((cause: unknown) => {
          throw new Error(storagePublicError(cause), { cause })
        })
        published = result.prefix
      }
      if (!this.publicDelivery && login !== undefined)
        this.output.notice(describeCliCredentialSource(login))
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
        : this.publicDelivery
          ? 'The directory is published. Public images use permanent unsigned CDN URLs; cached bytes cannot be recalled.'
          : 'Private direct images render at request time. Use --public only for a public directory, or --private for request-authorized redirects.'
      const envBlock = storageImageEnvBlock(this.publicDelivery)
      this.output.print(
        `Created ${created.join(', ')}\n${instruction}\nAdd an image with storage store and open /storage-image-example. Commit ${this.receipts}.\n${this.writeEnv ? 'Rendering values were saved privately; never commit .env.local.' : `Add your rendering values to .env.local:\n${envBlock}`}`,
        { files: created, environment: envBlock },
      )
      return undefined
    } catch (error) {
      for (const path of created) await rm(path)
      this.output.error(
        `${ensureError(error).message}${published === undefined ? '' : ` The server prefix ${published} remains public; use storage unpublish deliberately if needed.`}`,
      )
      return 1
    }
  }
}
