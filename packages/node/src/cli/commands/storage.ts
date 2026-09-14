import type { HeadObjectCommandOutput } from '@aws-sdk/client-s3'

import type { StoredImageReceipt } from '../../storageImage.ts'

import { basename, resolve } from 'node:path'

import { validateStoragePath } from '@transloadit/utils'
import { Command, Option } from 'clipanion'
import pMap from 'p-map'
import { z } from 'zod'

import { ApiError } from '../../ApiError.ts'
import InconsistentResponseError from '../../InconsistentResponseError.ts'
import { normalizeStoragePublicPrefix } from '../../storagePublicPrefixes.ts'
import { Transloadit } from '../../Transloadit.ts'
import { noticeCliCredentialSource, quoteCliArgument, resolveCliConfig } from '../helpers.ts'
import { storagePublicError } from '../storagePublic.ts'
import {
  assertStorageWorkspace,
  defaultStorageCatalog,
  readStorageCatalog,
  storageCatalogDelivery,
  storageTypesPath,
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
  dryRun = Option.Boolean('--dry-run', false, {
    description: 'List matching objects without publishing or changing the catalog',
  })
  protected async run(): Promise<number | undefined> {
    try {
      noticeCliCredentialSource(this.cliConfig, this.output)
      const prefix = normalizeStoragePublicPrefix(this.prefix)
      if (this.dryRun) {
        const catalog = await readStorageCatalog(this.receipts)
        const objects = await withStorageS3(
          {
            endpoint: this.endpoint,
            workspace: this.workspace,
            projectWorkspace: catalog?.workspace,
          },
          (client, workspace) => listStorageObjects(client, workspace, prefix),
          'Publication dry run',
          undefined,
          this.cliConfig,
        )
        this.output.print(
          `Would publish ${prefix} recursively, including future objects. Nothing changed.\n${objects.length === 0 ? 'No stored objects currently match.' : objects.map(({ path, size }) => `${JSON.stringify(path)}\t${size} bytes`).join('\n')}`,
          { prefix, objects },
        )
        return undefined
      }
      await updateStorageReceipts(this.receipts, async (previous, signal) => {
        const workspace = await resolveStorageWorkspace(
          this,
          this.cliConfig,
          previous?.workspace,
          signal,
        )
        const result = await this.client
          .publishStoragePrefix(prefix, { signal })
          .catch((cause: unknown) => {
            signal.throwIfAborted()
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
          ...previous,
          workspace,
          delivery:
            previous?.delivery ?? storageCatalogDelivery(this.endpoint ?? this.cliConfig.endpoint),
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
      noticeCliCredentialSource(this.cliConfig, this.output)
      const prefix = normalizeStoragePublicPrefix(this.prefix)
      await updateStorageReceipts(this.receipts, async (previous, signal) => {
        const workspace = await resolveStorageWorkspace(
          this,
          this.cliConfig,
          previous?.workspace,
          signal,
        )
        const result = await this.client
          .unpublishStoragePrefix(prefix, { signal })
          .catch((cause: unknown) => {
            signal.throwIfAborted()
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
          ...previous,
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
      noticeCliCredentialSource(this.cliConfig, this.output)
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
      The catalog defaults to transloadit.images.json; --receipts selects another file.
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
  publicDelivery = Option.Boolean('--public', false, {
    description:
      'Publish the destination directory recursively, including current and future objects',
  })
  protected async run(): Promise<number | undefined> {
    const file = resolve(this.receipts)
    let stored: { receipt?: StoredImageReceipt } = {}
    let destination = this.destination
    let workspace: string | undefined
    let saved = false
    let published: string | undefined
    try {
      noticeCliCredentialSource(this.cliConfig, this.output)
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
        if (resolve(storageTypesPath(file)) === resolve(input.file))
          throw new Error('The generated declarations file cannot be the input image')
        validateStoragePath(input.path)
      }
      if (new Set(inputs.map((input) => input.path)).size !== inputs.length)
        throw new Error(
          'Input image basenames collide in the destination directory; rename them first',
        )
      const publicPrefix = this.publicDelivery
        ? normalizeStoragePublicPrefix(
            this.destination.slice(0, this.destination.lastIndexOf('/') + 1),
          )
        : undefined
      for (const input of inputs) {
        destination = input.path
        stored = {}
        saved = false
        await updateStorageReceipts(
          file,
          async (receipts, signal) => {
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
              onReceipt: (receipt, expected, assemblyId) => {
                const sizeMatches = receipt.size === expected.size
                const md5Matches = receipt.md5hash === expected.md5hash
                this.output.debug(
                  JSON.stringify({
                    assemblyId,
                    result: receipt,
                    input: expected,
                    sizeMatches,
                    md5Matches,
                  }),
                )
                if (!sizeMatches || !md5Matches) {
                  const difference = sizeMatches
                    ? 'same size, different MD5'
                    : `${expected.size.toLocaleString('en-US')} → ${receipt.size.toLocaleString('en-US')} bytes`
                  this.output.warn(
                    `Stored bytes differ from ${input.file} (${difference}); the workspace plan may have transformed the upload (for example, a Community-plan watermark on older deployments). The receipt describes the stored image.`,
                  )
                }
              },
              ...(this.overwrite ? { overwrite: true } : {}),
            })
            if (receipts !== undefined && receipts.workspace !== workspace) {
              this.output.notice(
                `Catalog ${this.receipts} was not changed; it belongs to ${receipts.workspace}. Use --receipts for a separate catalog.`,
              )
              return undefined
            }
            return {
              ...receipts,
              workspace,
              delivery:
                receipts?.delivery ??
                storageCatalogDelivery(this.endpoint ?? this.cliConfig.endpoint),
              public: receipts?.public ?? [],
              images: { ...receipts?.images, [stored.receipt.path]: stored.receipt },
            }
          },
          () => {
            saved = true
          },
        )
        if (stored.receipt === undefined) throw new Error('Storage did not return a receipt')
        if (publicPrefix !== undefined && published === undefined) {
          this.output.notice(
            `Publishing ${publicPrefix} recursively: all current and future objects under this prefix will be public.`,
          )
          await updateStorageReceipts(file, async (previous, signal) => {
            const result = await this.client
              .publishStoragePrefix(publicPrefix, { signal })
              .catch((cause: unknown) => {
                signal.throwIfAborted()
                throw new Error(storagePublicError(cause, workspace), { cause })
              })
            published = result.prefix
            if (previous === undefined || previous.workspace !== workspace) return undefined
            return { ...previous, public: [...new Set([...previous.public, result.prefix])] }
          })
        }
        const receipt = stored.receipt
        const attribute = (value: string): string =>
          value
            .replaceAll('&', '&amp;')
            .replaceAll('"', '&quot;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
        const src = attribute(receipt.path)
        const alt = attribute(
          basename(receipt.path)
            .replace(/\.[^.]+$/, '')
            .replaceAll(/[-_]+/g, ' '),
        )
        this.output.print(
          `${saved ? `Saved ${receipt.path} in ${this.receipts}. Commit this catalog and ${storageTypesPath(this.receipts)}.` : `Stored ${receipt.path}; the different-workspace project catalog was left unchanged.`}\nRender it with <StorageImage src="${src}" alt="${alt}" width={${Math.min(receipt.width, 960)}} />\nReplace alt with a description (or an empty string for a decorative image).`,
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
            ...(published === undefined
              ? []
              : [
                  `The server prefix ${published} remains public; use storage unpublish deliberately if needed.`,
                ]),
            saved
              ? `Receipt saved in ${this.receipts}. No further files were uploaded. Do not re-upload this object.`
              : 'The object was stored successfully. Do not re-upload; recover the verified receipt below.',
            `Receipt: ${JSON.stringify(stored.receipt)}`,
          ].join('\n'),
        )
        return 1
      }
      const recovery =
        failure instanceof InconsistentResponseError
          ? z
              .object({
                assemblyId: z.string().min(1),
                receiptCheck: z
                  .object({
                    originalCount: z.number().int().nonnegative(),
                    metadataValid: z.boolean(),
                    pathMatches: z.boolean().optional(),
                    sizeMatches: z.boolean().optional(),
                    md5Matches: z.boolean().optional(),
                  })
                  .optional(),
              })
              .safeParse(failure.cause)
          : undefined
      if (recovery?.success) {
        this.output.debug(JSON.stringify(recovery.data))
        const options = [
          `--receipts ${quoteCliArgument(this.receipts)}`,
          ...(this.endpoint ? [`--endpoint ${quoteCliArgument(this.endpoint)}`] : []),
          ...(this.workspace ? [`--workspace ${quoteCliArgument(this.workspace)}`] : []),
        ].join(' ')
        this.output.error(
          [
            failure.message,
            `Destination: ${JSON.stringify(destination)}`,
            `Assembly ID: ${JSON.stringify(recovery.data.assemblyId)}`,
            ...(recovery.data.receiptCheck === undefined
              ? []
              : [
                  'The Assembly did not return usable receipt metadata. Do not re-upload; inspect Storage and recover its metadata:',
                  // A filename prefix also works for root objects without scanning the workspace.
                  `transloadit storage ls ${quoteCliArgument(destination)} ${options}`,
                  `transloadit storage receipts sync ${quoteCliArgument(destination)} ${options}`,
                ]),
          ].join('\n'),
        )
        return 1
      }
      if (failure instanceof ApiError && failure.code === 'TRANSLOADIT_STORE_CONFLICT') {
        this.output.error(
          `Storage destination ${JSON.stringify(destination)} already exists. Choose a fresh name; use --overwrite only if you deliberately want to replace that object.`,
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
    description:
      'List stored paths and sizes; include ETags with --json, without creating an Assembly',
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
      Uses the same Auth Key and workspace discovery as storage ls, with dam:write scope to also
      recover the server's declared public prefixes. Requires the Storage S3 read API.
      Adds or refreshes matched paths; never prunes unmatched local entries. Keeps existing upload
      asset_id/size only when the HEAD MD5 matches; otherwise replaces with rendering metadata.
      All listed images must expose valid dam-width/dam-height metadata. Any failure preserves the
      previous file. No Assembly, original download or remote write is performed.
    `,
    examples: [['Recover website images', 'transloadit storage receipts sync website/']],
  })

  prefix = Option.String({ required: true })
  workspace = Option.String('--workspace', {
    description: 'Explicit workspace slug (otherwise discovered from this Auth Key)',
  })
  receipts = Option.String('--receipts', defaultStorageCatalog, {
    description: 'JSON rendering catalog to update atomically (default: transloadit.images.json)',
  })

  protected async run(): Promise<number | undefined> {
    try {
      let count = 0
      let synced: Record<string, unknown> = {}
      let catalogUpdated = false
      const config = resolveCliConfig()
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
          config,
        )
        if (actualWorkspace === undefined) throw new Error('Storage did not identify a workspace')
        if (previous !== undefined && previous.workspace !== actualWorkspace) {
          this.output.notice(
            `Catalog ${this.receipts} was not changed; it belongs to ${previous.workspace}. Use --receipts for a separate catalog.`,
          )
          return undefined
        }
        // Recover policy with the same key/endpoint as the S3 reads, never an unrelated bearer
        // token or a folder-name guess. Neither half is committed if this read fails.
        if (config.credentials === undefined) throw new Error('Storage credentials are missing')
        const policyClient = new Transloadit({
          ...config.credentials,
          endpoint: new URL(
            this.endpoint ?? config.credentialsEndpoint ?? 'https://api2.transloadit.com',
          ).origin,
          maxRetries: 0,
        })
        const policy = await policyClient
          .listPublicStoragePrefixes({
            signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
          })
          .catch((error: unknown) => {
            signal.throwIfAborted()
            throw new Error(
              'Recovery incomplete: could not read the server public prefixes. Check the API endpoint and Auth Key dam:write scope, then retry. The existing catalog was preserved.',
              { cause: error },
            )
          })
        catalogUpdated = true
        if (policy.public_prefixes.length === 0)
          this.output.notice(
            'No public prefixes are declared on the server. For public delivery, deliberately publish a directory with storage publish; otherwise configure authorize for private images. Sync never publishes files.',
          )
        return {
          ...previous,
          workspace: actualWorkspace,
          delivery:
            previous?.delivery ??
            storageCatalogDelivery(this.endpoint ?? config.credentialsEndpoint),
          public: policy.public_prefixes.map(({ prefix }) => prefix),
          images: { ...previous?.images, ...synced },
        }
      })
      this.output.print(
        catalogUpdated
          ? `Synced ${count} rendering receipts and public policy to ${this.receipts}. Unmatched entries were preserved. Commit this file before building.`
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
