import type { StorageProjectCatalog } from './catalog.ts'

import { publishImageHint } from './pathHints.ts'

/** Server-side development probe; logs the target origin/path, never queries or raw errors. */
export type DiagnoseStorageImage = (
  path: string,
  url: string,
  publicPrefix?: string,
) => Promise<string>

const deliveryOverrideHint =
  'If you use a different API or CDN, set baseUrl/urlParams in the plugin delivery override or factory.'

async function probe(path: string, url: string, publicPrefix?: string): Promise<string> {
  const target = new URL(url)
  const safeUrl = `${target.origin}${target.pathname}`
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    const header = response.headers.get('Transloadit-Error')
    // The header is an error-code label, never an arbitrary upstream message or response body.
    const code =
      header !== null && header.length <= 64 && /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(header)
        ? header
        : undefined
    const status = `HTTP ${response.status}${code === undefined ? '' : ` (${code})`}`
    const summary = `HEAD ${safeUrl}: ${status}`
    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
      const format = target.searchParams.get('f')
      const expectedType =
        format === 'jpg'
          ? 'image/jpeg'
          : format === 'webp' || format === 'avif' || format === 'png'
            ? `image/${format}`
            : undefined
      const actualType = response.headers.get('content-type')?.split(';')[0]?.trim()
      if (expectedType !== undefined && actualType !== expectedType) {
        console.warn(
          `[Image] Development HEAD ${safeUrl} returned ${actualType}, expected ${expectedType}. The configured Template must honor the requested image format (f); use the compatible image Template recipe.`,
        )
        return `${summary}; received ${actualType}, expected ${expectedType}`
      }
      if (
        publicPrefix !== undefined &&
        response.headers.get('cache-control')?.includes('immutable')
      )
        console.info(
          `[Image] Public delivery verified at ${safeUrl}: image response with immutable caching.`,
        )
      return summary
    }
    // A manual HEAD cannot establish whether the browser's redirect target is a valid image.
    if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.has('location'))
      return summary
    const hints =
      code === 'INSUFFICIENT_AUTH_SCOPE'
        ? 'Grant smart_cdn:sign for image delivery. In Console → Credentials, edit the application key: enable Smart CDN and smart_cdn:sign; assemblies:write is also accepted, but grants broader Assembly access.'
        : response.status === 404
          ? 'Check the workspace slug, that the source path exists, and the configured Template.'
          : publicPrefix !== undefined && code === 'NO_SIGNATURE_FIELD'
            ? `Storage path ${JSON.stringify(path)} may no longer be under a published public prefix. If already published, check its workspace and public Built-in. If it should be private, remove its public prefix from the catalog or factory and configure private delivery with application authorization. ${publishImageHint(path, publicPrefix)}`
            : publicPrefix === undefined && (response.status === 401 || response.status === 403)
              ? 'Enable Smart CDN on the Auth Key; check its workspace and the signature secret, expiry and server clock.'
              : response.ok
                ? 'Expected an image Content-Type. Check the configured Template and delivery endpoint.'
                : `The delivery host did not serve this path as an image. Check the delivery endpoint and Template. ${deliveryOverrideHint}`
    console.warn(`[Image] Development HEAD ${safeUrl} returned ${status}. ${hints}`)
    return summary
  } catch {
    // Error messages can include a credential-bearing URL. A HEAD failure does not establish
    // whether the cause is credentials, networking, a cold transformation, or the CDN itself.
    console.warn(
      `[Image] Could not reach Smart CDN at ${safeUrl} within five seconds. Check connectivity to this delivery host. ${deliveryOverrideHint}`,
    )
    return `HEAD ${safeUrl}: could not reach the delivery host within five seconds`
  }
}

/** Deduplicates concurrent and repeated probes within one credentialed development integration. */
export function createImageDiagnostics(template: string): DiagnoseStorageImage | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined
  const requests = new Map<string, Promise<string>>()
  return (path, url, publicPrefix) => {
    const key = JSON.stringify([path, template])
    const previous = requests.get(key)
    if (previous !== undefined) return previous
    const result = probe(path, url, publicPrefix)
    requests.set(key, result)
    return result
  }
}

declare global {
  var __transloaditImagePublicPolicies: Map<string, readonly string[]> | undefined
}

/** Keeps only dev policy snapshots across HMR; each project's catalog has a distinct identity. */
export function diagnosePublicPolicy(catalog: StorageProjectCatalog, id?: string): void {
  if (process.env.NODE_ENV !== 'development' || id === undefined) return
  globalThis.__transloaditImagePublicPolicies ??= new Map()
  const policies = globalThis.__transloaditImagePublicPolicies
  const previous = policies.get(id)
  policies.set(id, [...catalog.public])
  if (previous === undefined) return
  const privatePaths = Object.keys(catalog.images).filter(
    (path) =>
      previous.some((prefix) => path.startsWith(prefix)) &&
      !catalog.public.some((prefix) => path.startsWith(prefix)),
  )
  if (privatePaths.length === 0) return
  console.info(
    `[Image] Catalog public prefixes changed. These paths now require the private image route and authorization: ${privatePaths.map((path) => JSON.stringify(path)).join(', ')}.`,
  )
}
