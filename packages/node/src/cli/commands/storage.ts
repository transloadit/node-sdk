import type { StoredImageReceipt } from '../../storageImage.ts'

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { basename, posix, resolve } from 'node:path'

import { validateStoragePath } from '@transloadit/utils'
import { Command, Option } from 'clipanion'
import { z } from 'zod'

import { ApiError } from '../../ApiError.ts'
import { storedAssetSchema } from '../../alphalib/types/storageAsset.ts'
import InconsistentResponseError from '../../InconsistentResponseError.ts'
import { normalizeStoragePublicPrefix } from '../../storagePublicPrefixes.ts'
import { Transloadit } from '../../Transloadit.ts'
import { noticeCliCredentialSource, quoteCliArgument, resolveCliConfig } from '../helpers.ts'
import {
  listStorageAssets,
  resolveStorageWorkspace,
  withStorageCatalog,
} from '../storageCatalog.ts'
import { storagePublicError } from '../storagePublic.ts'
import {
  assertStorageCatalogOrigin,
  assertStorageWorkspace,
  defaultStorageCatalog,
  readStorageCatalog,
  storageCatalogDelivery,
  storageTypesPath,
  updateStorageReceipts,
} from '../storageReceipts.ts'
import { storageImageConfigAdvice, storageImagePrivateAdvice } from '../storageSnippets.ts'
import { ensureError } from '../types.ts'
import { AuthenticatedCommand, UnauthenticatedCommand } from './BaseCommand.ts'

abstract class StorageProjectCommand extends AuthenticatedCommand {
  protected get apiOrigin(): string {
    return new URL(this.endpoint ?? this.cliConfig.endpoint ?? 'https://api2.transloadit.com')
      .origin
  }
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
        const objects = await withStorageCatalog(
          {
            endpoint: this.endpoint,
            workspace: this.workspace,
            projectWorkspace: catalog?.workspace,
          },
          (client, workspace) => listStorageAssets(client, workspace, prefix),
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
        if (previous?.workspace === workspace)
          assertStorageCatalogOrigin(previous, this.apiOrigin, this.receipts)
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
          apiOrigin: this.apiOrigin,
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
        if (previous?.workspace === workspace)
          assertStorageCatalogOrigin(previous, this.apiOrigin, this.receipts)
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
          apiOrigin: this.apiOrigin,
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

interface CliStoredImageReceipt extends StoredImageReceipt {
  source?: string
  apiOrigin?: string
}

async function hashImageFile(
  file: string,
  signal: AbortSignal,
): Promise<{ md5hash: string; size: number }> {
  const hash = createHash('md5')
  let size = 0
  // A bounded preflight lets the CLI skip an upload. storeImage still independently verifies it.
  for await (const chunk of createReadStream(file, { signal })) {
    hash.update(chunk)
    size += chunk.length
  }
  if (size === 0) throw new Error('Cannot store an empty image')
  signal.throwIfAborted()
  return { md5hash: hash.digest('hex'), size }
}

/** Stores originals in order, checkpointing each verified receipt before the next upload. */
export class StorageStoreCommand extends StorageProjectCommand {
  static override paths = [['storage', 'store']]

  static override usage = Command.Usage({
    category: 'Storage',
    description: 'Store original images and save verified metadata for Image',
    details: `
      Uses the CLI's Assembly credentials (environment, .env or ~/.transloadit/credentials).
      Storage writes must be enabled. Existing Storage paths conflict unless --overwrite is explicit.
      --hashed inserts eight MD5 hex digits before the extension. Matching catalog receipts skip
      repeat uploads; changed bytes get a fresh name. --hashed cannot be combined with --overwrite.
      The project catalog binds workspace, published prefixes and image receipts. Each successful
      upload is saved atomically before the next. Do not run two writers against the same catalog.
      The catalog defaults to transloadit.images.json; --receipts selects another file.
    `,
    examples: [
      ['Store a hero image', 'transloadit storage store ./hero.jpg website/hero.jpg'],
      ['Store a content-addressed image', 'transloadit storage store ./hero.jpg website/ --hashed'],
      ['Store a directory of originals', 'transloadit storage store ./images/*.jpg website/'],
    ],
  })

  files = Option.Rest({ required: 1 })
  destination = Option.String({ required: true })
  hashed = Option.Boolean('--hashed', false, {
    description: 'Add an eight-digit content hash to the filename; reuse matching catalog receipts',
  })
  overwrite = Option.Boolean('--overwrite', false, {
    description: 'Explicitly replace an existing Storage path',
  })
  publicDelivery = Option.Boolean('--public', false, {
    description:
      'Publish the destination directory recursively, including current and future objects',
  })
  protected async run(): Promise<number | undefined> {
    const file = resolve(this.receipts)
    let stored: { receipt?: CliStoredImageReceipt } = {}
    let destination = this.destination
    let workspace: string | undefined
    let saved = false
    let published: string | undefined
    try {
      noticeCliCredentialSource(this.cliConfig, this.output)
      if (this.hashed && this.overwrite)
        throw new Error(
          '--hashed cannot be combined with --overwrite; changed bytes get a new name',
        )
      const apiOrigin = this.apiOrigin
      const uploaded = new Map<string, CliStoredImageReceipt>()
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
      if (!this.hashed && new Set(inputs.map((input) => input.path)).size !== inputs.length)
        throw new Error(
          'Input image basenames collide in the destination directory; rename them first',
        )
      const publicPrefix = this.publicDelivery
        ? normalizeStoragePublicPrefix(
            this.destination.slice(0, this.destination.lastIndexOf('/') + 1),
          )
        : undefined
      let setupPrinted = false
      for (const input of inputs) {
        let publicImage = false
        let unchanged = false
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
            if (receipts?.workspace === workspace)
              assertStorageCatalogOrigin(receipts, apiOrigin, this.receipts)
            signal.throwIfAborted()
            if (this.hashed) {
              const { md5hash, size } = await hashImageFile(input.file, signal)
              const extension = posix.extname(destination)
              destination = `${destination.slice(0, destination.length - extension.length)}.${md5hash.slice(0, 8)}${extension}`
              validateStoragePath(destination)
              // Explicit workspace overrides leave the catalog alone; still deduplicate this batch.
              const candidate =
                uploaded.get(destination) ??
                (receipts?.workspace === workspace && Object.hasOwn(receipts.images, destination)
                  ? receipts.images[destination]
                  : undefined)
              if (candidate !== undefined) {
                const previous = hashedReceiptSchema.safeParse(candidate)
                if (!previous.success || previous.data.path !== destination)
                  throw new Error(
                    `Catalog receipt for ${JSON.stringify(destination)} is incomplete or does not match this file. Run transloadit storage receipts sync ${quoteCliArgument(destination)} --receipts ${quoteCliArgument(this.receipts)}${this.endpoint === undefined ? '' : ` --endpoint ${quoteCliArgument(this.endpoint)}`} to recover version identity from the same API environment, then retry; nothing uploaded.`,
                  )
                if (previous.data.apiOrigin !== apiOrigin)
                  throw new Error(
                    `Cannot verify that ${JSON.stringify(destination)} was stored at ${apiOrigin}. Use --receipts for a separate catalog for this API environment; nothing uploaded.`,
                  )
                if (previous.data.md5hash !== md5hash || previous.data.size !== size)
                  throw new Error(
                    `Stored bytes for ${JSON.stringify(destination)} differ from this file. An older deployment may have transformed the upload, or the short hashes collided. Restoring the same receipt will not help; choose another destination basename. Nothing uploaded or replaced.`,
                  )
                stored.receipt = previous.data
                unchanged = true
              }
            }
            stored.receipt ??= await this.client.storeImage(input.file, {
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
            if (stored.receipt.workspace !== workspace)
              throw new Error(
                `The stored receipt belongs to Workspace ${stored.receipt.workspace}, not ${workspace}. The project catalog was not changed; inspect the Assembly before retrying.`,
              )
            if (!unchanged)
              stored.receipt = {
                ...stored.receipt,
                ...(this.hashed ? { source: basename(input.file) } : {}),
                apiOrigin,
              }
            if (this.hashed) uploaded.set(destination, stored.receipt)
            if (receipts !== undefined && receipts.workspace !== workspace) {
              this.output.notice(
                `Catalog ${this.receipts} was not changed; it belongs to ${receipts.workspace}. Use --receipts for a separate catalog.`,
              )
              return undefined
            }
            publicImage = receipts?.public.some((prefix) => destination.startsWith(prefix)) ?? false
            // Replays must not reorder fields or discard application metadata from a saved receipt.
            if (unchanged) return receipts
            return {
              ...receipts,
              workspace,
              apiOrigin,
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
            if (previous?.workspace === workspace)
              assertStorageCatalogOrigin(previous, apiOrigin, this.receipts)
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
        publicImage ||= published !== undefined && receipt.path.startsWith(published)
        const blur =
          saved && publicImage && receipt.thumbhash !== undefined && receipt.hasAlpha !== true
        // A foreign catalog says nothing about this destination's policy or rendering setup.
        const setupAdvice =
          !saved || setupPrinted
            ? ''
            : `${publicImage ? '' : storageImagePrivateAdvice(receipt.path, this.receipts === defaultStorageCatalog ? undefined : this.receipts)}${await storageImageConfigAdvice()}`
        setupPrinted ||= saved
        const attribute = (value: string): string =>
          value
            .replaceAll('&', '&amp;')
            .replaceAll('"', '&quot;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
        const src = attribute(receipt.path)
        const alt = attribute(
          basename(receipt.source ?? receipt.path)
            .replace(/\.[^.]+$/, '')
            .replaceAll(/[-_]+/g, ' '),
        )
        const renderAdvice = saved
          ? `Render it with <Image storage src="${src}" alt="${alt}" width={${Math.min(receipt.width, 960)}}${blur ? ' placeholder="blur"' : ''} />\nReplace alt with a description (or an empty string for a decorative image).${setupAdvice}`
          : 'Use --receipts for a separate catalog before rendering images from this workspace.'
        this.output.print(
          `${unchanged ? `Unchanged ${receipt.path}; no upload needed.\n` : ''}${saved ? `Saved ${receipt.path} in ${this.receipts}. Commit this catalog and ${storageTypesPath(this.receipts)}.` : `Stored ${receipt.path}; the different-workspace project catalog was left unchanged.`}\n${renderAdvice}`,
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
                  'The commands below require the native Storage catalog API. On an older deployment without these routes, inspect the Assembly in Console and restore a verified catalog receipt.',
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
          this.hashed
            ? `Storage destination ${JSON.stringify(destination)} already exists, but no matching catalog receipt proves its contents. Restore its catalog receipt or choose another destination basename; the object was not replaced.`
            : `Storage destination ${JSON.stringify(destination)} already exists. Choose a fresh name; use --overwrite only if you deliberately want to replace that object.`,
        )
        return 1
      }
      this.output.error(failure.message)
      return 1
    }
  }
}

/** Lists version-pinned metadata through the authenticated native Storage catalog. */
export class StorageListCommand extends UnauthenticatedCommand {
  static override paths = [['storage', 'ls']]
  static override usage = Command.Usage({
    category: 'Storage',
    description: 'List stored paths and sizes; include asset/version identities with --json',
    details:
      'Uses an Auth Key with dam:read or dam:write scope and bounded native catalog pages. Verifies the Workspace against the selected credentials. No Assembly, S3 request or original download is needed.',
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
      const objects = await withStorageCatalog(
        {
          endpoint: this.endpoint,
          workspace: this.workspace,
          projectWorkspace: catalog?.workspace,
        },
        (client, workspace) => listStorageAssets(client, workspace, this.prefix),
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

const uploadEvidenceSchema = storedAssetSchema.extend({
  thumbhash: z.string().max(48).optional(),
  hasAlpha: z.boolean().optional(),
  source: z.string().optional(),
  apiOrigin: z.string().url().optional(),
})

const hashedReceiptSchema = uploadEvidenceSchema.extend({
  md5hash: storedAssetSchema.shape.md5hash.unwrap(),
  width: storedAssetSchema.shape.width.unwrap(),
  height: storedAssetSchema.shape.height.unwrap(),
})

/** Recovers pinned receipts from bounded native catalog pages without downloading originals. */
export class StorageReceiptsSyncCommand extends UnauthenticatedCommand {
  static override paths = [['storage', 'receipts', 'sync']]
  static override usage = Command.Usage({
    category: 'Storage',
    description: 'Rebuild saved rendering metadata from the Storage catalog',
    details: `
      Uses native catalog pages and dam:write scope to also recover declared public prefixes.
      Adds or refreshes matched paths; never prunes unmatched entries. Local placeholder metadata
      survives only for the same retained version. Every matched image must have catalog dimensions.
      Any failure preserves the previous file. No Assembly, original download or remote write occurs.
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
        let apiOrigin: string | undefined
        synced = await withStorageCatalog(
          {
            endpoint: this.endpoint,
            workspace: this.workspace,
            projectWorkspace: previous?.workspace,
            signal,
          },
          async (client, workspace, endpoint) => {
            actualWorkspace = workspace
            apiOrigin = endpoint
            if (previous?.workspace === workspace)
              assertStorageCatalogOrigin(previous, endpoint, this.receipts)
            const assets = await listStorageAssets(client, workspace, this.prefix, signal)
            const entries = assets.map((asset) => {
              try {
                validateStoragePath(asset.path)
              } catch (cause) {
                throw new Error(
                  `Storage path ${JSON.stringify(asset.path)} is valid for listing but unsupported by the image renderer. Rename it before recovering an image catalog.`,
                  { cause },
                )
              }
              if (asset.width === undefined || asset.height === undefined) {
                throw new Error(
                  `Storage image ${JSON.stringify(asset.path)} needs positive catalog width and height. Select an image-only prefix and backfill missing dimensions before retrying.`,
                )
              }
              const evidence = uploadEvidenceSchema.safeParse(
                previous?.workspace === workspace && Object.hasOwn(previous.images, asset.path)
                  ? previous.images[asset.path]
                  : undefined,
              )
              const retained =
                evidence.success &&
                evidence.data.asset_id === asset.asset_id &&
                evidence.data.version_id === asset.version_id
                  ? evidence.data
                  : {}
              return [asset.path, { ...retained, ...asset, apiOrigin: endpoint }]
            })
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
        // Recover policy with the same key/endpoint as catalog reads, never an unrelated bearer
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
          apiOrigin,
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
