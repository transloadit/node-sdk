import type { HeadObjectCommandOutput } from '@aws-sdk/client-s3'

import type { StoredImageReceipt } from '../../storageImage.ts'

import { basename, resolve } from 'node:path'

import { validateStoragePath } from '@transloadit/utils'
import { Command, Option } from 'clipanion'
import pMap from 'p-map'
import { z } from 'zod'

import InconsistentResponseError from '../../InconsistentResponseError.ts'
import { normalizeStoragePublicPrefix } from '../../storagePublicPrefixes.ts'
import { describeCliCredentialSource } from '../helpers.ts'
import { storagePublicError } from '../storagePublic.ts'
import {
  assertStorageWorkspace,
  defaultStorageCatalog,
  readStorageCatalog,
  updateStorageReceipts,
} from '../storageReceipts.ts'
import {
  listStorageObjects,
  resolveStorageWorkspace,
  storageS3ConnectionErrorSchema,
  storageS3ErrorSchema,
  withStorageS3,
} from '../storageS3.ts'
import { ensureError } from '../types.ts'
import { AuthenticatedCommand, UnauthenticatedCommand } from './BaseCommand.ts'

abstract class StorageProjectCommand extends AuthenticatedCommand {
  receipts = Option.String('--receipts', defaultStorageCatalog, {
    description: 'Committed project catalog with workspace, public prefixes and image receipts',
  })
  workspace = Option.String('--workspace', {
    description:
      'Explicit workspace override; a different workspace never changes this project catalog',
  })
}

/** Publishes an explicit directory, independently of uploads or local snippet generation. */
export class StoragePublishCommand extends StorageProjectCommand {
  static override paths = [['storage', 'publish']]
  static override usage = Command.Usage({
    category: 'Storage',
    description: 'Declare a directory public for unsigned Smart CDN delivery',
  })
  prefix = Option.String({ required: true })
  protected async run(): Promise<number | undefined> {
    try {
      this.output.notice(describeCliCredentialSource(this.cliConfig))
      const prefix = normalizeStoragePublicPrefix(this.prefix)
      await updateStorageReceipts(this.receipts, async (previous, signal) => {
        const workspace = await resolveStorageWorkspace(
          this,
          this.cliConfig,
          previous?.workspace,
          signal,
        )
        const result = await this.client.publishStoragePrefix(prefix).catch((cause: unknown) => {
          throw new Error(storagePublicError(cause, workspace), { cause })
        })
        this.output.print(
          `Published ${result.prefix}. Files under this directory can be served without signatures.`,
          result,
        )
        if (previous !== undefined && previous.workspace !== workspace) {
          this.output.notice(
            `Catalog ${this.receipts} was not changed; it belongs to ${previous.workspace}.`,
          )
          return undefined
        }
        return {
          workspace,
          public: [...new Set([...(previous?.public ?? []), result.prefix])],
          images: previous?.images ?? {},
        }
      })
      return undefined
    } catch (error) {
      this.output.error(ensureError(error).message)
      return 1
    }
  }
}

/** Revokes a public prefix at the origin without promising to recall cached bytes. */
export class StorageUnpublishCommand extends StorageProjectCommand {
  static override paths = [['storage', 'unpublish']]
  static override usage = Command.Usage({
    category: 'Storage',
    description: 'Revoke public origin access to a directory',
  })
  prefix = Option.String({ required: true })
  protected async run(): Promise<number | undefined> {
    try {
      this.output.notice(describeCliCredentialSource(this.cliConfig))
      const prefix = normalizeStoragePublicPrefix(this.prefix)
      await updateStorageReceipts(this.receipts, async (previous, signal) => {
        const workspace = await resolveStorageWorkspace(
          this,
          this.cliConfig,
          previous?.workspace,
          signal,
        )
        const result = await this.client.unpublishStoragePrefix(prefix).catch((cause: unknown) => {
          throw new Error(storagePublicError(cause, workspace), { cause })
        })
        this.output.print(
          `Unpublished ${result.prefix}; already cached or downloaded bytes cannot be recalled.`,
          result,
        )
        if (previous !== undefined && previous.workspace !== workspace) {
          this.output.notice(
            `Catalog ${this.receipts} was not changed; it belongs to ${previous.workspace}.`,
          )
          return undefined
        }
        return {
          workspace,
          public: (previous?.public ?? []).filter((prefix) => prefix !== result.prefix),
          images: previous?.images ?? {},
        }
      })
      return undefined
    } catch (error) {
      this.output.error(ensureError(error).message)
      return 1
    }
  }
}

/** Lists explicit publication policy using the signed API, not S3 discovery. */
export class StoragePublicationsCommand extends AuthenticatedCommand {
  static override paths = [['storage', 'publications']]
  static override usage = Command.Usage({
    category: 'Storage',
    description: 'List explicitly public Storage directories',
  })
  protected async run(): Promise<number | undefined> {
    try {
      this.output.notice(describeCliCredentialSource(this.cliConfig))
      const result = await this.client.listPublicStoragePrefixes()
      this.output.print(
        result.public_prefixes.length === 0
          ? 'No Storage directories are public.'
          : result.public_prefixes.map(({ prefix }) => prefix).join('\n'),
        result,
      )
      return undefined
    } catch (error) {
      this.output.error(storagePublicError(error, this.cliConfig.authWorkspace))
      return 1
    }
  }
}

/** Stores originals in order, checkpointing each verified receipt before the next upload. */
export class StorageStoreCommand extends StorageProjectCommand {
  static override paths = [['storage', 'store']]

  static override usage = Command.Usage({
    category: 'Storage',
    description: 'Store original images and save verified metadata for StorageImage',
    details: `
      Uses the CLI's Assembly credentials (environment, .env or ~/.transloadit/credentials).
      Storage writes must be enabled. Existing Storage paths conflict unless --overwrite is explicit.
      The project catalog binds workspace, published prefixes and image receipts. Each successful
      upload is saved atomically before the next. Do not run two writers against the same catalog.
    `,
    examples: [
      ['Store a hero image', 'transloadit storage store ./hero.jpg website/hero.jpg'],
      ['Store a directory of originals', 'transloadit storage store ./images/*.jpg website/'],
    ],
  })

  files = Option.Rest({ required: 1 })
  destination = Option.String({ required: true })
  overwrite = Option.Boolean('--overwrite', false, {
    description: 'Explicitly replace an existing Storage path',
  })
  protected async run(): Promise<number | undefined> {
    const file = resolve(this.receipts)
    let stored: { receipt?: StoredImageReceipt } = {}
    let destination = this.destination
    let workspace: string | undefined
    try {
      this.output.notice(describeCliCredentialSource(this.cliConfig))
      if (this.files.length > 1 && !this.destination.endsWith('/'))
        throw new Error('Multiple images need a directory destination ending in /')
      const inputs = this.files.map((input) => ({
        file: input,
        path: this.destination.endsWith('/')
          ? `${this.destination}${basename(input)}`
          : this.destination,
      }))
      for (const input of inputs) {
        if (file === resolve(input.file))
          throw new Error('The receipts file cannot be the input image')
        validateStoragePath(input.path)
      }
      if (new Set(inputs.map((input) => input.path)).size !== inputs.length)
        throw new Error(
          'Input image basenames collide in the destination directory; rename them first',
        )
      for (const input of inputs) {
        destination = input.path
        stored = {}
        let saved = false
        await updateStorageReceipts(file, async (receipts, signal) => {
          workspace ??= await resolveStorageWorkspace(
            this,
            this.cliConfig,
            receipts?.workspace,
            signal,
          )
          assertStorageWorkspace(workspace, receipts?.workspace, this.workspace)
          signal.throwIfAborted()
          stored.receipt = await this.client.storeImage(input.file, {
            path: destination,
            signal,
            ...(this.overwrite ? { overwrite: true } : {}),
          })
          if (receipts !== undefined && receipts.workspace !== workspace) {
            this.output.notice(
              `Catalog ${this.receipts} was not changed; it belongs to ${receipts.workspace}. Use --receipts for a separate catalog.`,
            )
            return undefined
          }
          saved = true
          return {
            workspace,
            public: receipts?.public ?? [],
            images: { ...receipts?.images, [stored.receipt.path]: stored.receipt },
          }
        })
        if (stored.receipt === undefined) throw new Error('Storage did not return a receipt')
        const receipt = stored.receipt
        const src = receipt.path
          .replaceAll('&', '&amp;')
          .replaceAll('"', '&quot;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
        this.output.print(
          `${saved ? `Saved ${receipt.path} in ${this.receipts}. Commit this receipt file.` : `Stored ${receipt.path}; the different-workspace project catalog was left unchanged.`}\nRender it with <StorageImage src="${src}" alt="" width={${Math.min(receipt.width, 960)}} />\n{/* Empty alt is decorative; replace it for an informative image. */}`,
          receipt,
        )
      }
      return undefined
    } catch (error) {
      const failure = ensureError(error)
      if (stored.receipt !== undefined) {
        this.output.error(
          [
            failure.message,
            'The object was stored successfully. Do not re-upload; recover the verified receipt below.',
            `Receipt: ${JSON.stringify(stored.receipt)}`,
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
            `Destination: ${JSON.stringify(destination)}`,
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
      'Uses an Auth Key with read or dam:write scope and the S3-compatible Storage API. Infers the workspace from ListBuckets unless --workspace is supplied. --endpoint accepts the API origin, not a bucket URL.',
    examples: [['List website images', 'transloadit storage ls website/']],
  })

  prefix = Option.String({ required: true })
  workspace = Option.String('--workspace', {
    description: 'Explicit workspace slug (otherwise discovered from this Auth Key)',
  })
  receipts = Option.String('--receipts', defaultStorageCatalog, {
    description: 'Project catalog whose workspace must match the selected credentials',
  })

  protected async run(): Promise<number | undefined> {
    try {
      const catalog = await readStorageCatalog(this.receipts)
      const objects = await withStorageS3(
        {
          endpoint: this.endpoint,
          workspace: this.workspace,
          projectWorkspace: catalog?.workspace,
        },
        (client, workspace) => listStorageObjects(client, workspace, this.prefix),
        'Storage listing',
        this.output,
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

const uploadEvidenceSchema = z.object({
  md5hash: z.string().regex(/^[a-f0-9]{32}$/i),
  asset_id: z.string().min(1).optional(),
  size: z.number().int().nonnegative().optional(),
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
      Uses the same Auth Key with read or dam:write scope, endpoint and workspace discovery as storage ls.
      Adds or refreshes matched paths; never prunes unmatched local entries. Keeps existing upload
      asset_id/size only when the HEAD MD5 matches; otherwise replaces with rendering metadata.
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
  receipts = Option.String('--receipts', defaultStorageCatalog, {
    description: 'JSON rendering catalog to update atomically, for example images.json',
  })

  protected async run(): Promise<number | undefined> {
    try {
      let count = 0
      let synced: Record<string, unknown> = {}
      let catalogUpdated = false
      await updateStorageReceipts(resolve(this.receipts), async (previous, signal) => {
        let actualWorkspace: string | undefined
        synced = await withStorageS3(
          {
            endpoint: this.endpoint,
            workspace: this.workspace,
            projectWorkspace: previous?.workspace,
            signal,
          },
          async (client, workspace) => {
            actualWorkspace = workspace
            const objects = await listStorageObjects(client, workspace, this.prefix, signal)
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
                  .send(new HeadObjectCommand({ Bucket: workspace, Key: path }), {
                    abortSignal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
                  })
                  .catch((error: unknown) => {
                    signal.throwIfAborted()
                    if (storageS3ConnectionErrorSchema.safeParse(error).success)
                      throw new Error(
                        `Storage HEAD for ${JSON.stringify(path)} timed out or lost its connection. Check the Storage endpoint and retry the sync.`,
                        { cause: error },
                      )
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
                const evidence = uploadEvidenceSchema.safeParse(
                  previous?.workspace === workspace && Object.hasOwn(previous.images, path)
                    ? previous.images[path]
                    : undefined,
                )
                const retained =
                  md5hash !== undefined &&
                  evidence.success &&
                  evidence.data.md5hash.toLowerCase() === md5hash
                    ? evidence.data
                    : {}
                return [
                  path,
                  {
                    ...retained,
                    path,
                    width: dimensions.data['dam-width'],
                    height: dimensions.data['dam-height'],
                    ...(md5hash === undefined ? {} : { md5hash }),
                  },
                ]
              },
              { concurrency: 5, signal },
            )
            count = entries.length
            return Object.fromEntries(entries)
          },
          'Storage receipt sync',
          this.output,
        )
        if (actualWorkspace === undefined) throw new Error('Storage did not identify a workspace')
        if (previous !== undefined && previous.workspace !== actualWorkspace) {
          this.output.notice(
            `Catalog ${this.receipts} was not changed; it belongs to ${previous.workspace}. Use --receipts for a separate catalog.`,
          )
          return undefined
        }
        catalogUpdated = true
        return {
          workspace: actualWorkspace,
          public: previous?.public ?? [],
          images: { ...previous?.images, ...synced },
        }
      })
      this.output.print(
        catalogUpdated
          ? `Synced ${count} rendering receipts to ${this.receipts}. Upload evidence is kept only when the HEAD MD5 matches; otherwise matched entries are replaced. Unmatched entries were preserved. Commit this file before building.`
          : `Read ${count} rendering receipts. Catalog unchanged because it belongs to another workspace.`,
        synced,
      )
      return undefined
    } catch (error) {
      this.output.error(ensureError(error).message)
      return 1
    }
  }
}
