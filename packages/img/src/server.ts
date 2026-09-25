import type { SmartCdnImageSignRequest } from '@transloadit/utils'

import type { StorageAction, StorageAssetReceipt, StorageRenditionPolicy } from './storage.ts'

import { getSignedSmartCdnUrl, validateStoragePath } from '@transloadit/utils'

import {
  getStorageImageReference,
  isStorageIdentifier,
  snapshotImageSource,
} from './imageSource.ts'
import { previewUrlParams } from './previewUrlParams.ts'
import { createStorageModel, snapshotStoragePolicy } from './storage.ts'

export type {
  StorageAction,
  StorageAssetReceipt,
  StorageImageReceipt,
  StorageRenditionPolicy,
} from './storage.ts'

/** One live application permission check returning authoritative metadata, never a boolean. */
export interface StorageAuthorizationRequest {
  request: Request
  asset_id: string
  version_id: string
  action: StorageAction
}

/** Explicit, server-owned configuration; this entry reads no environment or Node globals. */
export interface StorageRouteOptions {
  workspace: string
  authKey: string
  authSecret: string
  authorizeAsset: (
    input: StorageAuthorizationRequest,
  ) => StorageAssetReceipt | null | Promise<StorageAssetReceipt | null>
  policy?: StorageRenditionPolicy
  lifetimeMs?: number
  /** Trusted CDN override for local testing; never derive from the incoming request. */
  baseUrl?: string
  /** App-controlled development opt-in. Keep false in production. Logs only allowed variants. */
  diagnostics?: boolean
}

/** Standard Web handlers; calling either with an unsupported method returns 405. */
export interface StorageRoute {
  GET: (request: Request) => Promise<Response>
  HEAD: (request: Request) => Promise<Response>
}

interface Selection {
  asset_id: string
  version_id: string
  action: StorageAction
  w?: string
  f?: string
  crop?: string
}

function parseSelection(request: Request): Selection | undefined {
  const params = new URL(request.url).searchParams
  const action = params.get('action')
  if (action !== 'preview' && action !== 'original' && action !== 'download') return
  const allowed =
    action === 'preview'
      ? ['asset_id', 'version_id', 'action', 'w', 'f', 'crop']
      : ['asset_id', 'version_id', 'action']
  for (const name of params.keys())
    if (!allowed.includes(name) || params.getAll(name).length !== 1) return
  const asset_id = params.get('asset_id')
  const version_id = params.get('version_id')
  if (!isStorageIdentifier(asset_id) || !isStorageIdentifier(version_id)) return
  if (action !== 'preview') return { asset_id, version_id, action }
  const w = params.get('w')
  const f = params.get('f')
  const crop = params.get('crop') ?? undefined
  if (
    w === null ||
    !/^[1-9]\d{0,3}$/.test(w) ||
    Number(w) > 8000 ||
    (f !== 'avif' && f !== 'webp' && f !== 'png' && f !== 'jpg') ||
    (crop !== undefined && !/^[a-z][a-z0-9-]{0,31}$/.test(crop))
  )
    return
  return { asset_id, version_id, action, w, f, crop }
}

function respond(
  request: Request,
  status: number,
  message: string,
  headers?: HeadersInit,
): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', 'private, no-store')
  responseHeaders.set('Vary', 'Cookie, Authorization')
  responseHeaders.set('Referrer-Policy', 'no-referrer')
  return new Response(request.method === 'HEAD' ? null : message, {
    status,
    headers: responseHeaders,
  })
}

function validateConfiguration(options: StorageRouteOptions): void {
  if (typeof options.workspace !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(options.workspace))
    throw new TypeError('workspace must be a Workspace slug')
  if (
    typeof options.authKey !== 'string' ||
    !options.authKey ||
    typeof options.authSecret !== 'string' ||
    !options.authSecret ||
    typeof options.authorizeAsset !== 'function'
  )
    throw new TypeError('Server credentials and authorizeAsset are required')
  if (options.baseUrl !== undefined) {
    let parsed: URL
    try {
      parsed = new URL(options.baseUrl.replaceAll('{workspace}', 'workspace'))
    } catch {
      throw new TypeError('baseUrl must be a trusted HTTP(S) URL')
    }
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      throw new TypeError(
        'baseUrl must be a trusted HTTP(S) URL without credentials, query, or fragment',
      )
  }
}

/**
 * Reauthorizes every request and redirects only to exact retained versions and pinned Built-ins.
 * No byte proxy, metadata fetch, environment convenience, or shared authorization cache.
 */
export function createStorageRoute(options: StorageRouteOptions): StorageRoute {
  validateConfiguration(options)
  const { workspace, authKey, authSecret, baseUrl, authorizeAsset, diagnostics = false } = options
  const lifetimeMs = options.lifetimeMs ?? 5 * 60_000
  if (!Number.isSafeInteger(lifetimeMs) || lifetimeMs < 1000 || lifetimeMs > 48 * 3600_000)
    throw new TypeError('lifetimeMs must be an integer from 1000 through 172800000')
  const policy = snapshotStoragePolicy(options.policy)
  async function handle(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return respond(request, 405, 'Method not allowed', { Allow: 'GET, HEAD' })
    const selection = parseSelection(request)
    if (selection === undefined) return respond(request, 404, 'Not found')
    let failureStage = 'authorization'
    try {
      const { asset_id, version_id, action } = selection
      const receipt = await authorizeAsset({ request, asset_id, version_id, action })
      if (typeof receipt !== 'object' || receipt === null || Array.isArray(receipt))
        return respond(request, 404, 'Not found')
      let rendition: {
        template: string
        input: string
        urlParams: SmartCdnImageSignRequest['urlParams']
      }
      try {
        const reference = getStorageImageReference(receipt, workspace)
        if (reference.asset_id !== asset_id || reference.version_id !== version_id)
          return respond(request, 404, 'Not found')
        validateStoragePath(receipt.path)
        if (action === 'preview') {
          const src = { ...snapshotImageSource({ src: receipt }), ...reference }
          const candidates: SmartCdnImageSignRequest<undefined>[] = []
          // Unknown profiles are denials too; no client crop ratio ever enters the model.
          createStorageModel(src, policy, selection.crop, (candidate) => {
            candidates.push(candidate)
            return ''
          })
          const candidate = candidates.find(
            ({ urlParams }) => String(urlParams.w) === selection.w && urlParams.f === selection.f,
          )
          if (candidate === undefined) {
            if (diagnostics)
              console.warn(
                '[Viewer] Use the same policy on Image and createStorageRoute. Permitted candidate shape:',
                candidates.map(({ urlParams }) => ({
                  w: urlParams.w,
                  f: urlParams.f,
                  crop: selection.crop,
                })),
              )
            return respond(request, 404, 'Not found')
          }
          rendition = candidate
        } else {
          const filename = action === 'download' ? receipt.path.split('/').at(-1) : undefined
          // Same Unicode filename bounds as /file/serve, additionally excluding lone surrogates.
          if (
            action === 'download' &&
            (filename === undefined || !/^[^/\\\p{Cc}\p{Cs}]{1,255}$/u.test(filename))
          )
            return respond(request, 404, 'Not found')
          rendition = {
            template: 'builtin/storage-serve@0.0.3',
            input: asset_id,
            urlParams: { v: version_id, ...(filename === undefined ? {} : { download: filename }) },
          }
        }
      } catch {
        // Receipt validation failures and disallowed shapes share the absent-asset response.
        return respond(request, 404, 'Not found')
      }
      // Match the existing CDN rotation; Bunny keys on the full query including auth and expiry.
      const rotationMs = Math.min(60_000, Math.floor(lifetimeMs / 2))
      const expiresAt = Math.floor(Date.now() / rotationMs) * rotationMs + lifetimeMs
      failureStage = 'signing'
      const location = await getSignedSmartCdnUrl({
        workspace,
        authKey,
        authSecret,
        baseUrl,
        ...rendition,
        // Core candidates can carry an undefined expiry; the route owns the actual grant lifetime.
        expiresAt,
        urlParams: previewUrlParams(rendition.template, rendition.urlParams),
      })
      return respond(request, 307, '', { Location: location })
    } catch {
      // Never return authorizer errors, tokens, receipts or configuration in HTTP responses.
      // Log only the failing stage: arbitrary exception messages can themselves contain secrets.
      console.error(`[Viewer] Storage ${failureStage} failed.`)
      return respond(request, 500, 'Internal server error')
    }
  }
  return { GET: handle, HEAD: handle }
}
