import type { S3Client } from '@aws-sdk/client-s3'

import type { IOutputCtl } from './OutputCtl.ts'

import { z } from 'zod'

import {
  buildMissingCredentialsMessage,
  describeCliCredentialSource,
  resolveCliConfig,
} from './helpers.ts'

interface StorageObject {
  path: string
  size: number
  etag?: string
}

/** Reads only the public HTTP status, never upstream response bodies or signed request details. */
export const storageS3ErrorSchema = z.object({
  $metadata: z.object({ httpStatusCode: z.number().optional() }),
})

/** Timeout/deadline failures need network advice; other network errors retain existing handling. */
export const storageS3ConnectionErrorSchema = z.union([
  z.object({ name: z.enum(['TimeoutError', 'AbortError']) }),
  z.object({ code: z.enum(['ETIMEDOUT', 'ECONNRESET']) }),
])

/** Keeps workspace discovery, signing credentials and the trusted endpoint together for S3 reads. */
export async function withStorageS3<T>(
  options: { endpoint?: string; workspace?: string },
  operation: (client: S3Client, workspace: string) => Promise<T>,
  failure: string,
  output?: Pick<IOutputCtl, 'notice'>,
): Promise<T> {
  const config = resolveCliConfig()
  if (config.credentials === undefined)
    throw new Error(config.loadError ?? buildMissingCredentialsMessage())
  output?.notice(describeCliCredentialSource(config, 'credentials'))
  const endpoint = new URL(
    options.endpoint ?? config.credentialsEndpoint ?? 'https://api2.transloadit.com',
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
  // Keep the S3 client out of ordinary CLI startup and image-rendering bundles.
  const { ListBucketsCommand, S3Client } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    credentials: {
      accessKeyId: config.credentials.authKey,
      secretAccessKey: config.credentials.authSecret,
    },
    endpoint: endpoint.href,
    forcePathStyle: true,
    maxAttempts: 2,
    region: 'us-east-1',
    requestHandler: {
      connectionTimeout: 10_000,
      requestTimeout: 30_000,
      throwOnRequestTimeout: true,
    },
  })
  try {
    // Smithy's request timer stops at response headers; the signal also bounds body reads/retries.
    const buckets =
      options.workspace === undefined
        ? (
            await client.send(new ListBucketsCommand({}), {
              abortSignal: AbortSignal.timeout(60_000),
            })
          ).Buckets
        : undefined
    const workspace = options.workspace ?? (buckets?.length === 1 ? buckets[0]?.Name : undefined)
    if (!workspace)
      throw new Error('Could not determine one workspace; supply --workspace explicitly')
    return await operation(client, workspace)
  } catch (error) {
    if (storageS3ConnectionErrorSchema.safeParse(error).success)
      throw new Error(
        `${failure} timed out or lost its connection. Check the Storage endpoint and retry.`,
        { cause: error },
      )
    const remote = storageS3ErrorSchema.safeParse(error)
    if (remote.success) {
      throw new Error(
        `${failure} failed${remote.data.$metadata.httpStatusCode === undefined ? '' : ` (HTTP ${remote.data.$metadata.httpStatusCode})`}. Check that the Storage S3 API is enabled and that you are using the correct workspace and an Auth Key with read or dam:write scope.`,
        { cause: error },
      )
    }
    throw error
  } finally {
    client.destroy()
  }
}

/** Completes every listing page or fails; callers must never persist a silently partial catalog. */
export async function listStorageObjects(
  client: S3Client,
  workspace: string,
  prefix: string,
): Promise<StorageObject[]> {
  const { ListObjectsV2Command } = await import('@aws-sdk/client-s3')
  const objects: StorageObject[] = []
  const cursors = new Set<string>()
  let cursor: string | undefined
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: workspace, Prefix: prefix, ContinuationToken: cursor }),
      { abortSignal: AbortSignal.timeout(60_000) },
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
      throw new Error('Storage omitted or repeated its listing cursor; results would be incomplete')
    cursors.add(cursor)
  } while (cursor !== undefined)
  return objects
}
