import type { HeadObjectCommandOutput } from '@aws-sdk/client-s3'

import type { StoredImageReceipt } from '../../storageImage.ts'

import { relative, resolve } from 'node:path'

import { validateStoragePath } from '@transloadit/utils'
import { Command, Option } from 'clipanion'
import pMap from 'p-map'
import { z } from 'zod'

import InconsistentResponseError from '../../InconsistentResponseError.ts'
import { updateStorageReceipts } from '../storageReceipts.ts'
import { listStorageObjects, storageS3ErrorSchema, withStorageS3 } from '../storageS3.ts'
import {
  nextAppRoot,
  storageImageEnvBlock,
  storageImageFactory,
  storageImagePage,
} from '../storageSnippets.ts'
import { ensureError } from '../types.ts'
import { AuthenticatedCommand, UnauthenticatedCommand } from './BaseCommand.ts'

/** Stores one image and atomically appends its verified receipt for application imports. */
export class StorageStoreCommand extends AuthenticatedCommand {
  static override paths = [['storage', 'store']]

  static override usage = Command.Usage({
    category: 'Storage',
    description: 'Store one original image and save its verified metadata for StorageImage',
    details: `
      Uses the CLI's Assembly credentials (environment, .env or ~/.transloadit/credentials).
      Storage writes must be enabled. Existing Storage paths conflict unless --overwrite is explicit.
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
  overwrite = Option.Boolean('--overwrite', false, {
    description: 'Explicitly replace an existing Storage path',
  })
  receipts = Option.String('--receipts', 'images.json', {
    description: 'JSON receipts file to append to atomically, for example images.json',
  })
  privateDelivery = Option.Boolean('--private', false, {
    description: 'Print the request-authorized private integration',
  })
  publicDelivery = Option.Boolean('--public', false, {
    description: 'Declare the destination directory public in the printed static integration',
  })

  protected async run(): Promise<number | undefined> {
    const file = resolve(this.receipts)
    let verifiedReceipt: StoredImageReceipt | undefined
    try {
      if (this.privateDelivery && this.publicDelivery)
        throw new Error('Choose either --private or --public, not both')
      if (file === resolve(this.file))
        throw new Error('The receipts file cannot be the input image')
      await updateStorageReceipts(file, async (receipts) => {
        verifiedReceipt = await this.client.storeImage(this.file, {
          path: this.destination,
          ...(this.overwrite ? { overwrite: true } : {}),
        })
        return { ...receipts, [verifiedReceipt.path]: verifiedReceipt }
      })
      if (verifiedReceipt === undefined) throw new Error('Storage did not return a receipt')
      const receipt = verifiedReceipt
      const prefix = receipt.path.slice(0, receipt.path.lastIndexOf('/') + 1)
      const root = nextAppRoot() ?? ''
      if (prefix === '') {
        this.output.print(
          `Saved ${this.receipts}. Commit this receipt file.\n\nThis image is at the workspace root, so no factory is printed. For scoped delivery, choose an explicit directory prefix when storing images. To allow the entire workspace deliberately, configure allowWorkspaceRoot: true.`,
          receipt,
        )
        return undefined
      }
      this.output.print(
        `Saved ${this.receipts}. Commit this receipt file.\n\n${root}lib/storageImage.ts:\n${storageImageFactory({ prefix, privateDelivery: this.privateDelivery, publicDelivery: this.publicDelivery, receiptsImport: relative(resolve(`${root}lib`), file).replaceAll('\\', '/') })}\n${root}app/page.tsx:\n${storageImagePage(receipt.path)}\nRendering environment (.env.local):\n${storageImageEnvBlock}\n${this.publicDelivery ? 'Public images prerender with long-lived direct URLs. Rebuild before expiry; revocation requires key rotation and a rebuild.' : this.privateDelivery ? 'Export storageRoute as GET and HEAD; configure your application authorization before enabling access.' : 'Private direct images render at request time. Choose --public for explicitly public static images or --private for request-authorized redirects.'}\nhttps://github.com/transloadit/node-sdk/tree/main/packages/img#ship-it-privately`,
        receipt,
      )
      return undefined
    } catch (error) {
      const failure = ensureError(error)
      if (verifiedReceipt !== undefined) {
        this.output.error(
          [
            failure.message,
            'The object was stored successfully. Do not re-upload; recover the verified receipt below.',
            `Receipt: ${JSON.stringify(verifiedReceipt)}`,
          ].join('\n'),
        )
        return 1
      }
      const recovery =
        failure instanceof InconsistentResponseError
          ? z.object({ assemblyId: z.string().min(1) }).safeParse(failure.cause)
          : undefined
      if (recovery?.success) {
        this.output.error(
          [
            failure.message,
            `Destination: ${JSON.stringify(this.destination)}`,
            `Assembly ID: ${JSON.stringify(recovery.data.assemblyId)}`,
            "The object may already exist. A retry with conflict_strategy: 'error' will conflict if the destination is occupied. Inspect it before retrying.",
          ].join('\n'),
        )
        return 1
      }
      this.output.error(failure.message)
      return 1
    }
  }
}

/** Lists the authenticated workspace through Storage's existing, read-only S3 surface. */
export class StorageListCommand extends UnauthenticatedCommand {
  static override paths = [['storage', 'ls']]
  static override usage = Command.Usage({
    category: 'Storage',
    description: 'List stored paths, sizes and ETags without creating an Assembly',
    details:
      'Uses an Auth Key with read scope and the S3-compatible Storage API. Infers the workspace from ListBuckets unless --workspace is supplied. --endpoint accepts the API origin, not a bucket URL.',
    examples: [['List website images', 'transloadit storage ls website/']],
  })

  prefix = Option.String({ required: true })
  workspace = Option.String('--workspace', {
    description: 'Explicit workspace slug (otherwise discovered from this Auth Key)',
  })

  protected async run(): Promise<number | undefined> {
    try {
      const objects = await withStorageS3(
        this,
        (client, workspace) => listStorageObjects(client, workspace, this.prefix),
        'Storage listing',
      )
      this.output.print(
        objects.length === 0
          ? 'No stored objects match this prefix.'
          : objects
              .map((object) => `${JSON.stringify(object.path)}\t${object.size} bytes`)
              .join('\n'),
        objects,
      )
      return undefined
    } catch (error) {
      this.output.error(ensureError(error).message)
      return 1
    }
  }
}

const dimensionSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))
const imageMetadataSchema = z.object({
  'dam-width': dimensionSchema,
  'dam-height': dimensionSchema,
})

function md5FromHead(head: HeadObjectCommandOutput): string | undefined {
  // S3's multipart, SSE-KMS and SSE-C ETags are not original-byte MD5 checksums.
  if (
    head.SSECustomerAlgorithm !== undefined ||
    (head.ServerSideEncryption !== undefined && head.ServerSideEncryption !== 'AES256')
  )
    return undefined
  const etag = head.ETag
  const hash = etag?.startsWith('"') && etag.endsWith('"') ? etag.slice(1, -1) : etag
  return hash !== undefined && /^[a-f0-9]{32}$/i.test(hash) ? hash.toLowerCase() : undefined
}

/** Recovers rendering metadata using signed List + HEAD only, without downloading originals. */
export class StorageReceiptsSyncCommand extends UnauthenticatedCommand {
  static override paths = [['storage', 'receipts', 'sync']]
  static override usage = Command.Usage({
    category: 'Storage',
    description: 'Rebuild saved rendering metadata from the Storage catalog',
    details: `
      Uses the same read-scoped Auth Key, endpoint and workspace discovery as storage ls.
      Adds or refreshes matched paths; never prunes unmatched local entries. Matched entries become
      path/width/height and an MD5 when the HEAD ETag supports it, not full upload-integrity receipts.
      All listed images must expose valid dam-width/dam-height metadata. Any failure preserves the
      previous file. No Assembly, original download or remote write is performed.
    `,
    examples: [
      [
        'Recover website images',
        'transloadit storage receipts sync website/ --receipts images.json',
      ],
    ],
  })

  prefix = Option.String({ required: true })
  workspace = Option.String('--workspace', {
    description: 'Explicit workspace slug (otherwise discovered from this Auth Key)',
  })
  receipts = Option.String('--receipts', 'images.json', {
    description: 'JSON rendering catalog to update atomically, for example images.json',
  })

  protected async run(): Promise<number | undefined> {
    try {
      let count = 0
      let synced: Record<string, unknown> = {}
      await updateStorageReceipts(resolve(this.receipts), async (previous) => {
        synced = await withStorageS3(
          this,
          async (client, workspace) => {
            const objects = await listStorageObjects(client, workspace, this.prefix)
            const paths = new Set<string>()
            for (const { path } of objects) {
              try {
                validateStoragePath(path)
              } catch (error) {
                throw new Error(
                  `Storage image ${JSON.stringify(path)} has an unsupported path: ${ensureError(error).message}`,
                  { cause: error },
                )
              }
              if (!path.startsWith(this.prefix) || paths.has(path))
                throw new Error(
                  `Storage returned a duplicate path or one outside the requested prefix: ${JSON.stringify(path)}`,
                )
              paths.add(path)
            }
            const { HeadObjectCommand } = await import('@aws-sdk/client-s3')
            const entries = await pMap(
              objects,
              async ({ path }) => {
                const head = await client
                  .send(new HeadObjectCommand({ Bucket: workspace, Key: path }))
                  .catch((error: unknown) => {
                    const remote = storageS3ErrorSchema.safeParse(error)
                    const status = remote.success ? remote.data.$metadata.httpStatusCode : undefined
                    throw new Error(
                      `Storage HEAD failed for ${JSON.stringify(path)}${status === undefined ? '' : ` (HTTP ${status})`}. The object may have changed or access may be denied; check it and retry the sync.`,
                      { cause: error },
                    )
                  })
                const dimensions = imageMetadataSchema.safeParse(head.Metadata)
                if (!dimensions.success)
                  throw new Error(
                    `Storage image ${JSON.stringify(path)} needs positive integer dam-width and dam-height metadata. Select an image-only prefix and backfill missing catalog dimensions before retrying.`,
                  )
                const md5hash = md5FromHead(head)
                return [
                  path,
                  {
                    path,
                    width: dimensions.data['dam-width'],
                    height: dimensions.data['dam-height'],
                    ...(md5hash === undefined ? {} : { md5hash }),
                  },
                ]
              },
              { concurrency: 5 },
            )
            count = entries.length
            return Object.fromEntries(entries)
          },
          'Storage receipt sync',
        )
        return { ...previous, ...synced }
      })
      this.output.print(
        `Synced ${count} rendering receipts to ${this.receipts}. Unmatched entries were preserved. Commit this file before building.`,
        synced,
      )
      return undefined
    } catch (error) {
      this.output.error(ensureError(error).message)
      return 1
    }
  }
}
