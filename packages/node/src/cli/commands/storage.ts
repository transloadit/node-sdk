import { randomUUID } from 'node:crypto'
import { lstat, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

import { Command, Option } from 'clipanion'
import { z } from 'zod'

import { ensureError, isErrnoException } from '../types.ts'
import { AuthenticatedCommand } from './BaseCommand.ts'

async function readReceipts(file: string): Promise<Record<string, unknown>> {
  try {
    const info = await lstat(file)
    if (!info.isFile()) throw new Error('Expected a regular JSON file, not a symlink or directory')
    return z.record(z.string(), z.unknown()).parse(JSON.parse(await readFile(file, 'utf8')))
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') return {}
    throw new Error('Cannot read receipts: expected a JSON object keyed by Storage path', {
      cause: error,
    })
  }
}

/** Stores one image and atomically appends its verified receipt for application imports. */
export class StorageStoreCommand extends AuthenticatedCommand {
  static override paths = [['storage', 'store']]

  static override usage = Command.Usage({
    category: 'Storage',
    description: 'Store one original image and save its verified metadata for StorageImage',
    details: `
      Uses the CLI's Assembly credentials (environment, .env or ~/.transloadit/credentials).
      Storage writes must be enabled. Existing Storage paths are never overwritten.
      The receipts file is a JSON object keyed by complete Storage path, replaced atomically only
      after success. Do not run two writers against the same receipts file.
    `,
    examples: [
      [
        'Store a hero image',
        'transloadit storage store ./hero.jpg website/hero.jpg --receipts images.json',
      ],
    ],
  })

  file = Option.String({ required: true })
  destination = Option.String({ required: true })
  receipts = Option.String('--receipts', {
    description: 'JSON receipts file to append to atomically, for example images.json',
    required: true,
  })

  protected async run(): Promise<number | undefined> {
    const file = resolve(this.receipts)
    const lockPath = `${file}.lock`
    const temporary = join(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`)
    try {
      if (file === resolve(this.file))
        throw new Error('The receipts file cannot be the input image')
      // Fail fast rather than silently losing another process's receipts. A crashed writer's lock
      // is deliberately not stolen: the operator must confirm that no upload is still running.
      const lock = await open(lockPath, 'wx', 0o600).catch((error: unknown) => {
        if (isErrnoException(error) && error.code === 'EEXIST') {
          throw new Error(
            `The receipts file is locked by another storage store. Remove ${lockPath} only after confirming no writer is running.`,
            { cause: error },
          )
        }
        throw error
      })
      try {
        const receipts = await readReceipts(file)
        const receipt = await this.client.storeImage(this.file, { path: this.destination })
        await writeFile(
          temporary,
          `${JSON.stringify({ ...receipts, [receipt.path]: receipt }, null, 2)}\n`,
          {
            flag: 'wx',
            mode: 0o600,
          },
        )
        await rename(temporary, file)
        this.output.print(
          `Saved ${this.receipts}\n<StorageImage src={images[${JSON.stringify(receipt.path)}]} alt="Describe this image" />`,
          receipt,
        )
      } finally {
        await lock.close()
        await rm(temporary, { force: true })
        await rm(lockPath)
      }
      return undefined
    } catch (error) {
      this.output.error(ensureError(error).message)
      return 1
    }
  }
}
