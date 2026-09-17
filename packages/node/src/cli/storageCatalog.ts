import type { StoredAsset } from '../alphalib/types/storageAsset.ts'
import type { ResolvedCliConfig } from './helpers.ts'
import type { IOutputCtl } from './OutputCtl.ts'

import { validateStoragePath } from '@transloadit/utils'
import { RequestError } from 'got'

import { ApiError } from '../ApiError.ts'
import { Transloadit } from '../Transloadit.ts'
import {
  buildMissingCredentialsMessage,
  noticeCliCredentialSource,
  resolveCliConfig,
} from './helpers.ts'
import { assertStorageWorkspace } from './storageReceipts.ts'

function readDeadline(signal?: AbortSignal): AbortSignal {
  return signal === undefined
    ? AbortSignal.timeout(60_000)
    : AbortSignal.any([signal, AbortSignal.timeout(60_000)])
}

/** Keeps Workspace discovery, credentials and bounded catalog reads on the same trusted origin. */
export async function withStorageCatalog<T>(
  options: {
    endpoint?: string
    workspace?: string
    projectWorkspace?: string
    signal?: AbortSignal
  },
  operation: (client: Transloadit, workspace: string, endpoint: string) => Promise<T>,
  failure: string,
  output?: Pick<IOutputCtl, 'notice'>,
  config: ResolvedCliConfig = resolveCliConfig(),
): Promise<T> {
  if (config.credentials === undefined)
    throw new Error(config.loadError ?? buildMissingCredentialsMessage())
  noticeCliCredentialSource(config, output, 'credentials')
  const endpoint = new URL(
    options.endpoint ?? config.credentialsEndpoint ?? 'https://api2.transloadit.com',
  )
  if (
    !['http:', 'https:'].includes(endpoint.protocol) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.pathname !== '/'
  ) {
    throw new Error(
      'Storage endpoint must be an HTTP(S) API origin without credentials, query or fragment',
    )
  }
  const client = new Transloadit({
    ...config.credentials,
    endpoint: endpoint.origin,
    maxRetries: 0,
  })
  try {
    const { workspace } = await client.listStoredAssets({
      limit: 1,
      signal: readDeadline(options.signal),
    })
    assertStorageWorkspace(workspace, options.projectWorkspace, options.workspace)
    options.signal?.throwIfAborted()
    return await operation(client, workspace, endpoint.origin)
  } catch (error) {
    options.signal?.throwIfAborted()
    if (error instanceof ApiError) {
      const status = error.cause?.response?.statusCode
      throw new Error(
        `${failure} failed${status === undefined ? '' : ` (HTTP ${status})`}. Check the Storage API at ${endpoint.origin} and the Auth Key dam:read or dam:write scope.`,
        { cause: error },
      )
    }
    if (
      error instanceof RequestError ||
      (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))
    ) {
      throw new Error(
        `${failure} timed out or lost its connection. Check the Storage endpoint and retry.`,
        { cause: error },
      )
    }
    throw error
  }
}

/** Completes every bounded page, refusing wrong-Workspace, duplicate or out-of-prefix metadata. */
export async function listStorageAssets(
  client: Transloadit,
  workspace: string,
  prefix: string,
  signal?: AbortSignal,
): Promise<StoredAsset[]> {
  const assets: StoredAsset[] = []
  const paths = new Set<string>()
  const cursors = new Set<string>()
  let cursor: string | undefined
  do {
    const page = await client.listStoredAssets({
      prefix,
      cursor,
      limit: 500,
      signal: readDeadline(signal),
    })
    if (page.workspace !== workspace)
      throw new Error('Storage changed Workspace while paging the catalog')
    for (const asset of page.assets) {
      try {
        validateStoragePath(asset.path)
      } catch (error) {
        throw new Error(`Storage returned an invalid asset path: ${JSON.stringify(asset.path)}`, {
          cause: error,
        })
      }
      if (!asset.path.startsWith(prefix) || paths.has(asset.path)) {
        throw new Error(
          `Storage returned a duplicate path or one outside the requested prefix: ${JSON.stringify(asset.path)}`,
        )
      }
      paths.add(asset.path)
      assets.push(asset)
    }
    if (page.next_cursor === null) break
    cursor = page.next_cursor
    if (!cursor || cursors.has(cursor) || page.assets.at(-1)?.path !== cursor) {
      throw new Error('Storage omitted or repeated its listing cursor; results would be incomplete')
    }
    cursors.add(cursor)
  } while (cursor !== undefined)
  return assets
}

/** Verify writes against the selected key, not an unverified Workspace label in shell dotenv. */
export async function resolveStorageWorkspace(
  options: { endpoint?: string; workspace?: string },
  config: ResolvedCliConfig,
  projectWorkspace?: string,
  signal?: AbortSignal,
): Promise<string> {
  signal?.throwIfAborted()
  if (config.auth === undefined || !('authKey' in config.auth)) {
    throw new Error(
      'Storage project binding requires an Auth Key. Unset TRANSLOADIT_AUTH_TOKEN to use key credentials; run transloadit auth login if needed.',
    )
  }
  const sameEndpoint =
    options.endpoint === undefined ||
    new URL(options.endpoint).origin ===
      new URL(config.endpoint ?? 'https://api2.transloadit.com').origin
  const workspace =
    config.authWorkspaceVerified && sameEndpoint && config.authWorkspace !== undefined
      ? config.authWorkspace
      : await withStorageCatalog(
          { endpoint: options.endpoint, signal },
          async (_client, actual) => actual,
          'Workspace verification',
          undefined,
          {
            credentials: config.auth,
            credentialsEndpoint: config.endpoint,
            credentialsSource: config.authSource,
          },
        )
  assertStorageWorkspace(workspace, projectWorkspace, options.workspace)
  signal?.throwIfAborted()
  return workspace
}
