import { mkdir, open, rm } from 'node:fs/promises'
import { dirname } from 'node:path'

import { Command, Option } from 'clipanion'

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
  prefix = Option.String({ required: true })

  protected async run(): Promise<number | undefined> {
    const created: string[] = []
    try {
      if (!this.next) throw new Error('Choose the Next.js integration with --next')
      const prefix = this.prefix
      if (
        !prefix.endsWith('/') ||
        prefix.normalize('NFC') !== prefix ||
        Buffer.byteLength(prefix) > 1024 ||
        /[\p{Cc}\p{Cs}\\|]/u.test(prefix) ||
        prefix
          .slice(0, -1)
          .split('/')
          .some((part) => part.trim() === '' || part === '.' || part === '..')
      ) {
        throw new Error(
          'Provide one safe relative directory prefix ending in /, for example website/',
        )
      }
      const root = nextAppRoot()
      if (root === undefined)
        throw new Error('Run image init in a Next.js project containing app/ or src/app/')
      const files = [
        {
          path: `${root}lib/storageImage.ts`,
          content: storageImageFactory(prefix, this.privateDelivery),
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
      ]
      for (const file of files) {
        await mkdir(dirname(file.path), { recursive: true })
        const handle = await open(file.path, 'wx')
        created.push(file.path)
        try {
          await handle.writeFile(file.content)
        } finally {
          await handle.close()
        }
      }
      const instruction = this.privateDelivery
        ? 'Connect your application session and per-object authorization in storageImage.ts; the generated handler denies access until then.'
        : 'Direct delivery makes this route dynamic; use redirect delivery for static pages.'
      this.output.print(
        `Created ${created.join(', ')}\n${instruction}\nAdd your rendering values to .env.local (build and runtime):\n${storageImageEnvBlock}`,
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
