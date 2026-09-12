import type { StoredImageReceipt } from '../../storageImage.ts'

import { randomUUID } from 'node:crypto'
import { chmod, lstat, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'

import { Command, Option } from 'clipanion'
import { z } from 'zod'

import InconsistentResponseError from '../../InconsistentResponseError.ts'
import { requireCliCredentials, resolveCliConfig } from '../helpers.ts'
import {
  nextAppRoot,
  storageImageEnvBlock,
  storageImageFactory,
  storageImagePage,
} from '../storageSnippets.ts'
import { ensureError, isErrnoException } from '../types.ts'
import { AuthenticatedCommand, UnauthenticatedCommand } from './BaseCommand.ts'

// Keep every JSON key verbatim: a Storage filename may be "__proto__", which z.record strips.
const receiptsSchema = z.custom<Record<string, unknown>>(
  (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value),
)

async function readReceipts(
  file: string,
): Promise<{ receipts: Record<string, unknown>; mode: number }> {
  try {
    const info = await lstat(file)
    if (!info.isFile()) throw new Error('Expected a regular JSON file, not a symlink or directory')
    return {
      receipts: receiptsSchema.parse(JSON.parse(await readFile(file, 'utf8'))),
      mode: info.mode & 0o777,
    }
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') return { receipts: {}, mode: 0o600 }
    const reason =
      error instanceof SyntaxError
        ? 'invalid JSON'
        : error instanceof z.ZodError
          ? 'expected a JSON object keyed by Storage path'
          : ensureError(error).message
    throw new Error(`Cannot read receipts ${JSON.stringify(file)}: ${reason}`, { cause: error })
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
  receipts = Option.String('--receipts', {
    description: 'JSON receipts file to append to atomically, for example images.json',
    required: true,
  })

  protected async run(): Promise<number | undefined> {
    const file = resolve(this.receipts)
    const lockPath = `${file}.lock`
    const temporary = join(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`)
    let verifiedReceipt: StoredImageReceipt | undefined
    let retainTemporary = false
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
        const { receipts, mode } = await readReceipts(file)
        const receipt = await this.client.storeImage(this.file, {
          path: this.destination,
          ...(this.overwrite ? { overwrite: true } : {}),
        })
        verifiedReceipt = receipt
        await writeFile(
          temporary,
          `${JSON.stringify({ ...receipts, [receipt.path]: receipt }, null, 2)}\n`,
          {
            flag: 'wx',
            mode: 0o600,
          },
        )
        retainTemporary = true
        await chmod(temporary, mode)
        await rename(temporary, file)
        retainTemporary = false
        const prefix = receipt.path.slice(0, receipt.path.lastIndexOf('/') + 1)
        const root = nextAppRoot() ?? ''
        this.output.print(
          `Saved ${this.receipts}. Commit this receipt file.\n\n${root}lib/storageImage.ts:\n${storageImageFactory(prefix)}\n${root}app/page.tsx:\n${storageImagePage(receipt.path, relative(resolve(`${root}app`), file).replaceAll('\\', '/'))}\nRendering environment (.env.local; build and runtime):\n${storageImageEnvBlock}\nDirect delivery makes this route dynamic; use redirect delivery for static pages.\nFor private images, use createPrivateStorageImages with your application authorization:\nhttps://github.com/transloadit/node-sdk/tree/main/packages/img#ship-it-privately`,
          receipt,
        )
      } finally {
        await lock.close()
        await rm(lockPath, { force: true })
        if (!retainTemporary) await rm(temporary, { force: true })
      }
      return undefined
    } catch (error) {
      const failure = ensureError(error)
      if (verifiedReceipt !== undefined) {
        this.output.error(
          [
            failure.message,
            'The object was stored successfully. Do not re-upload; recover the verified receipt below.',
            ...(retainTemporary
              ? [`Complete catalog retained at ${JSON.stringify(temporary)}.`]
              : []),
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
      const credentials = requireCliCredentials()
      if (!credentials.ok) throw new Error(credentials.error)
      const endpoint = new URL(
        this.endpoint ?? resolveCliConfig().endpoint ?? 'https://api2.transloadit.com',
      )
      if (
        !['http:', 'https:'].includes(endpoint.protocol) ||
        endpoint.username ||
        endpoint.password ||
        endpoint.search ||
        endpoint.hash ||
        (endpoint.pathname !== '/' && endpoint.pathname !== '/storage')
      ) {
        throw new Error(
          'Storage endpoint must be an HTTP(S) API origin without credentials, query or fragment',
        )
      }
      endpoint.pathname = '/storage'
      // Keep the S3 client out of the ordinary CLI startup and all image-rendering bundles.
      const { ListBucketsCommand, ListObjectsV2Command, S3Client } = await import(
        '@aws-sdk/client-s3'
      )
      const client = new S3Client({
        credentials: {
          accessKeyId: credentials.credentials.authKey,
          secretAccessKey: credentials.credentials.authSecret,
        },
        endpoint: endpoint.href,
        forcePathStyle: true,
        maxAttempts: 2,
        region: 'us-east-1',
        requestHandler: { connectionTimeout: 10_000, requestTimeout: 30_000 },
      })
      try {
        const buckets =
          this.workspace === undefined
            ? (await client.send(new ListBucketsCommand({}))).Buckets
            : undefined
        const workspace = this.workspace ?? (buckets?.length === 1 ? buckets[0]?.Name : undefined)
        if (!workspace)
          throw new Error('Could not determine one workspace; supply --workspace explicitly')
        const objects: { path: string; size: number; etag?: string }[] = []
        const cursors = new Set<string>()
        let cursor: string | undefined
        do {
          const page = await client.send(
            new ListObjectsV2Command({
              Bucket: workspace,
              Prefix: this.prefix,
              ContinuationToken: cursor,
            }),
          )
          for (const object of page.Contents ?? []) {
            if (
              object.Key === undefined ||
              object.Size === undefined ||
              !Number.isSafeInteger(object.Size) ||
              object.Size < 0
            )
              throw new Error('Storage returned an incomplete object listing')
            objects.push({
              path: object.Key,
              size: object.Size,
              ...(object.ETag === undefined ? {} : { etag: object.ETag }),
            })
          }
          if (!page.IsTruncated) break
          cursor = page.NextContinuationToken
          if (!cursor || cursors.has(cursor))
            throw new Error(
              'Storage omitted or repeated its listing cursor; results would be incomplete',
            )
          cursors.add(cursor)
        } while (cursor !== undefined)
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
        const remote = z
          .object({ $metadata: z.object({ httpStatusCode: z.number().optional() }) })
          .safeParse(error)
        if (remote.success) {
          throw new Error(
            `Storage listing failed${remote.data.$metadata.httpStatusCode === undefined ? '' : ` (HTTP ${remote.data.$metadata.httpStatusCode})`}. Check your workspace and a read-scoped Auth Key.`,
            { cause: error },
          )
        }
        throw error
      } finally {
        client.destroy()
      }
    } catch (error) {
      this.output.error(ensureError(error).message)
      return 1
    }
  }
}
