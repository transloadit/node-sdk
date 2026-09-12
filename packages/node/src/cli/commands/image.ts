import { mkdir, open, rm } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'

import { validateStoragePathPrefix } from '@transloadit/utils'
import { Command, Option } from 'clipanion'
import { parse } from 'dotenv'
import { z } from 'zod'

import { readCliInput } from '../helpers.ts'
import { promptSecretInput } from '../secretInput.ts'
import { nextAppRoot, storageImageEnvBlock, storageImageFactory } from '../storageSnippets.ts'
import { ensureError } from '../types.ts'
import { UnauthenticatedCommand } from './BaseCommand.ts'

/** Scaffolds the Node-runtime Next.js integration without overwriting code or env files. */
export class ImageInitCommand extends UnauthenticatedCommand {
  static override paths = [['image', 'init']]
  static override usage = Command.Usage({
    category: 'Storage',
    description: 'Create a Next.js StorageImage factory and print rendering environment names',
    examples: [['Set up website images', 'transloadit image init --next website/']],
  })

  next = Option.Boolean('--next', false)
  privateDelivery = Option.Boolean('--private', false, {
    description: 'Also generate a redirect route; denies access until you supply authorization',
  })
  publicDelivery = Option.Boolean('--public', false, {
    description: 'Declare this directory public and use static, long-lived direct image URLs',
  })
  receipts = Option.String('--receipts', 'images.json', {
    description: 'Rendering catalog imported by the factory',
  })
  writeEnv = Option.Boolean('--write-env', false, {
    description: 'Prompt for rendering values and create .env.local privately; never overwrite it',
  })
  stdin = Option.Boolean('--stdin', false, {
    description: 'Read the three rendering variables in dotenv format with --write-env',
  })
  prefix = Option.String({ required: true })

  protected async run(): Promise<number | undefined> {
    const created: string[] = []
    try {
      if (this.privateDelivery && this.publicDelivery)
        throw new Error('Choose either --private or --public, not both')
      if (this.stdin && !this.writeEnv) throw new Error('--stdin requires --write-env')
      const prefix = this.prefix
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
      if (this.writeEnv) {
        const labels = {
          TRANSLOADIT_WORKSPACE: 'Workspace slug',
          TRANSLOADIT_SMART_CDN_KEY: 'Smart CDN Auth Key (not the Assembly key)',
          TRANSLOADIT_SMART_CDN_SECRET: 'Smart CDN Auth Secret',
        }
        const input = this.stdin
          ? parse((await readCliInput({ inputPath: '-' })).content ?? '')
          : await promptSecretInput(labels)
        const value = z
          .string()
          .min(1)
          .max(4096)
          .regex(/^[^\s][^\r\n\0]*$/)
          .refine((text) => text.trim() === text)
        const parsed = z
          .object({
            TRANSLOADIT_WORKSPACE: value,
            TRANSLOADIT_SMART_CDN_KEY: value,
            TRANSLOADIT_SMART_CDN_SECRET: value,
          })
          .safeParse(input)
        if (!parsed.success)
          throw new Error(
            'Provide TRANSLOADIT_WORKSPACE, TRANSLOADIT_SMART_CDN_KEY and TRANSLOADIT_SMART_CDN_SECRET; nothing was written',
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
      for (const file of files) {
        await mkdir(dirname(file.path), { recursive: true })
        const handle = await open(file.path, 'wx', 0o600)
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
          ? 'Public images prerender with long-lived direct URLs. Rebuild before expiry; revocation requires key rotation and a rebuild.'
          : 'Private direct images render at request time. Use --public only for a public directory, or --private for request-authorized redirects.'
      this.output.print(
        `Created ${created.join(', ')}\n${instruction}\nCreate ${this.receipts} with storage store before building; commit the catalog.\n${this.writeEnv ? 'Rendering values were saved privately; never commit .env.local.' : `Add your rendering values to .env.local:\n${storageImageEnvBlock}`}`,
        { files: created, environment: storageImageEnvBlock },
      )
      return undefined
    } catch (error) {
      for (const path of created) await rm(path)
      this.output.error(ensureError(error).message)
      return 1
    }
  }
}
